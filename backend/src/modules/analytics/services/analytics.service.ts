import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { AppraisalRecord, AppraisalRecordDocument } from '../../performance/models/appraisal-record.schema';
import { Department, DepartmentDocument } from '../../organization-structure/models/department.schema';
import { Position, PositionDocument } from '../../organization-structure/models/position.schema';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
        @InjectModel(AppraisalRecord.name) private appraisalModel: Model<AppraisalRecordDocument>,
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Position.name) private positionModel: Model<PositionDocument>,
    ) { }

    /**
     * Predicts attrition risk for an employee based on multiple signals:
     * 1. Tenure (Risk spikes at 1.5 - 2 years if no movement)
     * 2. Performance Trends (Declining scores)
     * 3. Salary Benchmarking (Compared to department average)
     */
    async predictAttritionRisk(employeeId: string) {
        const employee = await this.employeeModel.findById(employeeId).populate(['primaryPositionId', 'primaryDepartmentId']);
        if (!employee) throw new NotFoundException('Employee not found');

        const appraisals = await this.appraisalModel
            .find({ employeeProfileId: new Types.ObjectId(employeeId), status: 'PUBLISHED' })
            .sort({ createdAt: -1 })
            .limit(3);

        let riskScore = 0;
        const riskFactors: string[] = [];

        // 1. Tenure Factor (months)
        const hireDate = new Date(employee.dateOfHire);
        const monthsTenure = (new Date().getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        if (monthsTenure >= 18 && monthsTenure <= 24) {
            riskScore += 25;
            riskFactors.push('Standard "Career Itch" zone (1.5-2 years tenure)');
        }

        // 2. Performance Trend Factor
        if (appraisals.length >= 2) {
            const latest = appraisals[0].totalScore || 0;
            const previous = appraisals[1].totalScore || 0;

            if (latest < previous * 0.9) {
                riskScore += 35;
                riskFactors.push('Declining performance trend (>10% drop in appraisal score)');
            }

            if (latest < 60) {
                riskScore += 20;
                riskFactors.push('Performance currently below threshold (<60%)');
            }
        }

        // 3. Compensation Comparison (Mock logic for now - compare to department avg if available)
        // In a real DS model, we'd check if they are in the bottom quartile of their pay grade.

        // Cap risk score
        riskScore = Math.min(riskScore + 10, 100); // Base 10% risk for everyone

        return {
            employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            riskScore,
            level: riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW',
            factors: riskFactors,
            updatedAt: new Date(),
        };
    }

    /**
     * Calculates Organizational Pulse Metrics
     */
    async getOrgPulse() {
        // Count all active/probation/on-leave employees
        const totalEmployees = await this.employeeModel.countDocuments({ 
            status: { $in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] } 
        });

        // Diversity Index (Simplified Simpson's Diversity Index for Gender)
        const genderDist = await this.employeeModel.aggregate([
            { $match: { status: { $in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] } } },
            { 
                $group: { 
                    _id: { $ifNull: ['$gender', 'NOT_SPECIFIED'] }, 
                    count: { $sum: 1 } 
                } 
            }
        ]);

        const totalAppraisals = await this.appraisalModel.countDocuments();
        const avgPerformance = await this.appraisalModel.aggregate([
            { $match: { status: 'PUBLISHED' } },
            { $group: { _id: null, avg: { $avg: '$totalScore' } } }
        ]);

        // Calculate average tenure
        const tenureData = await this.employeeModel.aggregate([
            { $match: { status: { $in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] }, dateOfHire: { $exists: true } } },
            { 
                $project: { 
                    tenureYears: { 
                        $divide: [
                            { $subtract: [new Date(), '$dateOfHire'] },
                            365.25 * 24 * 60 * 60 * 1000
                        ]
                    }
                }
            },
            { $group: { _id: null, avgTenure: { $avg: '$tenureYears' } } }
        ]);

        // Get dominant department
        const deptDist = await this.employeeModel.aggregate([
            { $match: { status: { $in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] }, primaryDepartmentId: { $exists: true } } },
            { $group: { _id: '$primaryDepartmentId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: 'departments',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'dept'
                }
            },
            { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } }
        ]);

        return {
            headcount: totalEmployees,
            genderDiversity: genderDist,
            avgPerformanceScore: Math.round((avgPerformance[0]?.avg || 0) * 10) / 10,
            activeAppraisals: totalAppraisals,
            avgTenure: Math.round((tenureData[0]?.avgTenure || 0) * 10) / 10,
            dominantDepartment: deptDist[0]?.dept?.name || 'N/A',
            timestamp: new Date()
        };
    }

    /**
     * Skill Matrix Aggregation for a department
     */
    async getDepartmentSkillMatrix(departmentId: string, userId?: string) {
        let targetDeptId = departmentId;

        // Resolve 'current' department if requested
        if (departmentId === 'current' && userId) {
            const user = await this.employeeModel.findById(userId);
            if (user?.primaryDepartmentId) {
                targetDeptId = user.primaryDepartmentId.toString();
            } else {
                return []; // Cannot resolve current department
            }
        }

        if (!Types.ObjectId.isValid(targetDeptId)) {
            return []; // Invalid ID
        }

        const employees = await this.employeeModel.find({
            primaryDepartmentId: new Types.ObjectId(targetDeptId),
            status: 'ACTIVE'
        });

        const skillMap = new Map<string, { total: number, count: number, employees: any[] }>();

        employees.forEach(emp => {
            const empSkills = (emp as any).skills || [];
            empSkills.forEach(skill => {
                const existing = skillMap.get(skill.name) || { total: 0, count: 0, employees: [] };
                existing.total += skill.level;
                existing.count += 1;
                existing.employees.push({ name: `${emp.firstName} ${emp.lastName}`, level: skill.level });
                skillMap.set(skill.name, existing);
            });
        });

        return Array.from(skillMap.entries()).map(([name, data]) => ({
            skill: name,
            avgLevel: data.total / data.count,
            headcount: data.count,
            topTalent: data.employees.sort((a, b) => b.level - a.level).slice(0, 3)
        }));
    }
}

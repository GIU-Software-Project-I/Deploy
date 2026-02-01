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

    /**
     * Get organization-wide skills analytics with optional department filter
     */
    async getOrgSkillsAnalytics(departmentId?: string) {
        // Build query
        const query: any = { 
            status: 'ACTIVE',
            'skills.0': { $exists: true } // Only employees with at least one skill
        };
        
        if (departmentId && Types.ObjectId.isValid(departmentId)) {
            query.primaryDepartmentId = new Types.ObjectId(departmentId);
        }

        const employees = await this.employeeModel.find(query)
            .populate('primaryDepartmentId')
            .select('firstName lastName skills primaryDepartmentId')
            .lean();

        // Aggregate skills across employees
        const skillMap = new Map<string, { 
            total: number; 
            count: number; 
            categories: Set<string>;
            verifiedCount: number;
            byDepartment: Map<string, { count: number; total: number }>;
        }>();
        
        const categoryMap = new Map<string, { total: number; count: number }>();
        const departmentSkillCounts = new Map<string, number>();

        employees.forEach(emp => {
            const empSkills = (emp as any).skills || [];
            const deptName = (emp.primaryDepartmentId as any)?.name || 'Unassigned';
            
            empSkills.forEach((skill: any) => {
                // Aggregate by skill name
                const existing = skillMap.get(skill.name) || { 
                    total: 0, count: 0, categories: new Set(), verifiedCount: 0, byDepartment: new Map() 
                };
                existing.total += skill.level;
                existing.count += 1;
                existing.categories.add(skill.category);
                if (skill.isVerified) existing.verifiedCount += 1;
                
                // Track by department
                const deptStats = existing.byDepartment.get(deptName) || { count: 0, total: 0 };
                deptStats.count += 1;
                deptStats.total += skill.level;
                existing.byDepartment.set(deptName, deptStats);
                
                skillMap.set(skill.name, existing);
                
                // Aggregate by category
                const catStats = categoryMap.get(skill.category) || { total: 0, count: 0 };
                catStats.total += skill.level;
                catStats.count += 1;
                categoryMap.set(skill.category, catStats);
                
                // Count skills per department
                departmentSkillCounts.set(deptName, (departmentSkillCounts.get(deptName) || 0) + 1);
            });
        });

        // Build skills distribution
        const skillsDistribution = Array.from(skillMap.entries())
            .map(([name, data]) => ({
                skill: name,
                avgLevel: Math.round((data.total / data.count) * 10) / 10,
                employeeCount: data.count,
                category: Array.from(data.categories)[0] || 'General',
                verifiedPercentage: Math.round((data.verifiedCount / data.count) * 100),
                departmentBreakdown: Array.from(data.byDepartment.entries()).map(([dept, stats]) => ({
                    department: dept,
                    count: stats.count,
                    avgLevel: Math.round((stats.total / stats.count) * 10) / 10
                }))
            }))
            .sort((a, b) => b.employeeCount - a.employeeCount);

        // Build category summary
        const categoryDistribution = Array.from(categoryMap.entries())
            .map(([category, stats]) => ({
                category,
                avgLevel: Math.round((stats.total / stats.count) * 10) / 10,
                skillCount: stats.count
            }))
            .sort((a, b) => b.skillCount - a.skillCount);

        // Skills coverage metrics
        const totalEmployeesWithSkills = employees.length;
        const allActiveEmployees = await this.employeeModel.countDocuments({ status: 'ACTIVE' });
        const skillsCoverage = allActiveEmployees > 0 
            ? Math.round((totalEmployeesWithSkills / allActiveEmployees) * 100) 
            : 0;

        // Identify skill gaps (skills with avg level < 3)
        const skillGaps = skillsDistribution
            .filter(s => s.avgLevel < 3 && s.employeeCount >= 3)
            .slice(0, 10);

        // Top skills by proficiency
        const topSkills = skillsDistribution
            .filter(s => s.employeeCount >= 2)
            .sort((a, b) => b.avgLevel - a.avgLevel)
            .slice(0, 10);

        return {
            summary: {
                totalEmployeesWithSkills,
                totalEmployees: allActiveEmployees,
                skillsCoverage,
                uniqueSkillsCount: skillMap.size,
                categoriesCount: categoryMap.size,
                avgSkillsPerEmployee: employees.length > 0 
                    ? Math.round((Array.from(skillMap.values()).reduce((sum, s) => sum + s.count, 0) / employees.length) * 10) / 10 
                    : 0
            },
            skillsDistribution: skillsDistribution.slice(0, 20),
            categoryDistribution,
            skillGaps,
            topSkills,
            byDepartment: Array.from(departmentSkillCounts.entries())
                .map(([dept, count]) => ({ department: dept, skillCount: count }))
                .sort((a, b) => b.skillCount - a.skillCount)
        };
    }

    /**
     * Compare skills between two departments
     */
    async compareSkillsBetweenDepartments(deptId1: string, deptId2: string) {
        const [skills1, skills2] = await Promise.all([
            this.getDepartmentSkillMatrix(deptId1),
            this.getDepartmentSkillMatrix(deptId2)
        ]);

        const skill1Map = new Map(skills1.map(s => [s.skill, s]));
        const skill2Map = new Map(skills2.map(s => [s.skill, s]));

        const allSkills = new Set([...skill1Map.keys(), ...skill2Map.keys()]);
        
        const comparison = Array.from(allSkills).map(skillName => {
            const s1 = skill1Map.get(skillName);
            const s2 = skill2Map.get(skillName);
            return {
                skill: skillName,
                dept1AvgLevel: s1?.avgLevel || 0,
                dept1Count: s1?.headcount || 0,
                dept2AvgLevel: s2?.avgLevel || 0,
                dept2Count: s2?.headcount || 0,
                difference: Math.round(((s1?.avgLevel || 0) - (s2?.avgLevel || 0)) * 10) / 10
            };
        }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

        return {
            comparison,
            dept1UniqueSkills: skills1.filter(s => !skill2Map.has(s.skill)).length,
            dept2UniqueSkills: skills2.filter(s => !skill1Map.has(s.skill)).length,
            commonSkills: Array.from(allSkills).filter(s => skill1Map.has(s) && skill2Map.has(s)).length
        };
    }
}

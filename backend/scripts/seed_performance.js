const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/HR-System-test?appName=Cluster0';

const hrManagerId = '694653694663a24e78076014';
const deptHeadId = '6946536a4663a24e7807601d';
const hrEmployeeId = '6946536a4663a24e78076020';
const departmentId = '694653644663a24e78075fdc';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;

    // 1. Cleanup
    await db.collection('appraisal_templates').deleteMany({});
    await db.collection('appraisal_cycles').deleteMany({});
    await db.collection('appraisal_assignments').deleteMany({});
    await db.collection('appraisal_records').deleteMany({});
    await db.collection('appraisal_disputes').deleteMany({});
    console.log('Cleaned up existing performance data');

    // 2. Create Templates
    const templates = [
        {
            name: 'Standard Annual Performance Review',
            description: 'Comprehensive annual evaluation for all departments.',
            templateType: 'ANNUAL',
            ratingScale: {
                type: 'FIVE_POINT',
                min: 1,
                max: 5,
                labels: ['Unsatisfactory', 'Needs Improvement', 'Meets Expectations', 'Exceeds Expectations', 'Exceptional']
            },
            criteria: [
                { key: 'technical_skills', title: 'Technical Skills', details: 'Job-specific knowledge and application.', weight: 30, required: true, maxScore: 5 },
                { key: 'communication', title: 'Communication', details: 'Effectiveness in verbal and written interactions.', weight: 20, required: true, maxScore: 5 },
                { key: 'teamwork', title: 'Teamwork', details: 'Collaboration and contribution to team goals.', weight: 20, required: true, maxScore: 5 },
                { key: 'punctuality', title: 'Punctuality & Reliability', details: 'Consistency in attendance and timeline adherence.', weight: 15, required: true, maxScore: 5 },
                { key: 'leadership', title: 'Leadership potential', details: 'Ability to guide others and take initiative.', weight: 15, required: true, maxScore: 5 }
            ],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Quarterly Pulse Check',
            description: 'Short quarterly check-in on key objectives.',
            templateType: 'AD_HOC',
            ratingScale: {
                type: 'FIVE_POINT',
                min: 1,
                max: 5
            },
            criteria: [
                { key: 'goal_achievement', title: 'Goal Achievement', details: 'Progress toward objectives set for this period.', weight: 50, required: true, maxScore: 5 },
                { key: 'adaptability', title: 'Adaptability', details: 'Response to changing priorities.', weight: 50, required: true, maxScore: 5 }
            ],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    const templateResult = await db.collection('appraisal_templates').insertMany(templates);
    const annualTemplateId = templateResult.insertedIds[0];
    const adHocTemplateId = templateResult.insertedIds[1];
    console.log('Templates created');

    // 3. Create Cycles
    const cycles = [
        {
            name: 'FY2025 Annual Review Cycle',
            description: 'Main appraisal cycle for the fiscal year 2025.',
            cycleType: 'ANNUAL',
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-12-31'),
            managerDueDate: new Date('2026-01-31'),
            employeeAcknowledgementDueDate: new Date('2026-02-15'),
            templateAssignments: [
                { templateId: annualTemplateId, departmentIds: [new mongoose.Types.ObjectId(departmentId)] }
            ],
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Q1 2026 Flash Performance',
            description: 'Early year performance assessment.',
            cycleType: 'AD_HOC',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-03-31'),
            templateAssignments: [
                { templateId: adHocTemplateId, departmentIds: [] }
            ],
            status: 'PLANNED',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    const cycleResult = await db.collection('appraisal_cycles').insertMany(cycles);
    const activeCycleId = cycleResult.insertedIds[0];
    console.log('Cycles created');

    // 4. Create Assignments
    const assignments = [
        // HR Manager evaluating Dept Head
        {
            cycleId: activeCycleId,
            templateId: annualTemplateId,
            employeeProfileId: new mongoose.Types.ObjectId(deptHeadId),
            managerProfileId: new mongoose.Types.ObjectId(hrManagerId),
            departmentId: new mongoose.Types.ObjectId(departmentId),
            status: 'IN_PROGRESS',
            assignedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        },
        // Dept Head evaluating HR Employee
        {
            cycleId: activeCycleId,
            templateId: annualTemplateId,
            employeeProfileId: new mongoose.Types.ObjectId(hrEmployeeId),
            managerProfileId: new mongoose.Types.ObjectId(deptHeadId),
            departmentId: new mongoose.Types.ObjectId(departmentId),
            status: 'IN_PROGRESS',
            assignedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        },
        // HR Manager evaluating HR Employee
        {
            cycleId: activeCycleId,
            templateId: annualTemplateId,
            employeeProfileId: new mongoose.Types.ObjectId(hrEmployeeId),
            managerProfileId: new mongoose.Types.ObjectId(hrManagerId),
            departmentId: new mongoose.Types.ObjectId(departmentId),
            status: 'SUBMITTED',
            assignedAt: new Date(),
            submittedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    const assignmentResult = await db.collection('appraisal_assignments').insertMany(assignments);
    const assignment1Id = assignmentResult.insertedIds[0];
    const assignment2Id = assignmentResult.insertedIds[1];
    const assignment3Id = assignmentResult.insertedIds[2];
    console.log('Assignments created');

    // 5. Create Records
    const records = [
        {
            assignmentId: assignment2Id,
            cycleId: activeCycleId,
            templateId: annualTemplateId,
            employeeProfileId: new mongoose.Types.ObjectId(hrEmployeeId),
            managerProfileId: new mongoose.Types.ObjectId(deptHeadId),
            ratings: [
                { key: 'technical_skills', title: 'Technical Skills', ratingValue: 4, weightedScore: 1.2, comments: 'Strong technical execution.' },
                { key: 'communication', title: 'Communication', ratingValue: 3, weightedScore: 0.6, comments: 'Average communication, clear but could be more proactive.' },
                { key: 'teamwork', title: 'Teamwork', ratingValue: 5, weightedScore: 1.0, comments: 'Excellent team player, always helps others.' },
                { key: 'punctuality', title: 'Punctuality & Reliability', ratingValue: 4, weightedScore: 0.6, comments: 'Always on time.' },
                { key: 'leadership', title: 'Leadership potential', ratingValue: 2, weightedScore: 0.3, comments: 'Needs more initiative to lead projects.' }
            ],
            totalScore: 3.7,
            overallRatingLabel: 'Exceeds Expectations',
            managerSummary: 'A very reliable employee with strong core skills. Needs to step up in leadership roles.',
            strengths: 'Teamwork, and reliability.',
            improvementAreas: 'Leadership and proactive communication.',
            status: 'HR_PUBLISHED',
            managerSubmittedAt: new Date(),
            hrPublishedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    const recordResult = await db.collection('appraisal_records').insertMany(records);
    const recordId = recordResult.insertedIds[0];
    console.log('Records created');

    // 6. Create Disputes
    const disputes = [
        {
            appraisalId: recordId,
            assignmentId: assignment2Id,
            cycleId: activeCycleId,
            raisedByEmployeeId: new mongoose.Types.ObjectId(hrEmployeeId),
            reason: 'Rating for leadership is unfair',
            details: 'I led the Project X successfully for 3 months but was rated 2/5.',
            submittedAt: new Date(),
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    await db.collection('appraisal_disputes').insertMany(disputes);
    console.log('Disputes created');

    console.log('Seed completed successfully');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});

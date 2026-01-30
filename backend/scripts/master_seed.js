const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Types } = mongoose;

const MONGODB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/data?appName=Cluster0';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;

    // --- 0. CLEANUP (Destructive) ---
    const collections = [
        'departments', 'positions', 'pay_grades', 'employee_profiles',
        'employee_system_roles', 'attendance_logs', 'attendance_records',
        'leave_types', 'leave_requests', 'leave_entitlements',
        'appraisal_templates', 'appraisal_cycles', 'appraisal_assignments',
        'appraisal_records', 'appraisal_disputes',
        'job_requisitions', 'candidates', 'applications', 'onboardings',
        'pay_policies', 'payroll_runs', 'payslips', 'employee_payroll_details',
        'claims', 'disputes', 'refunds', 'users'
    ];
    for (const col of collections) {
        try {
            await db.collection(col).drop();
        } catch (e) {
            // console.warn(`Warning: Could not drop collection ${col}: ${e.message}`);
        }
    }
    console.log('--- SYSTEM PURGED: Starting Fresh Seed ---');

    const passwordHash = await bcrypt.hash('password123', 10);

    // --- 1. CORE STRUCTURE ---
    const deptsData = [
        { code: 'EXEC', name: 'Executive Office', costCenter: 'CC-001' },
        { code: 'HR', name: 'Human Resources', costCenter: 'CC-002' },
        { code: 'ENG', name: 'Engineering', costCenter: 'CC-003' },
        { code: 'SALES', name: 'Sales & Marketing', costCenter: 'CC-004' },
        { code: 'FIN', name: 'Finance & Legal', costCenter: 'CC-005' },
    ];
    const deptRes = await db.collection('departments').insertMany(deptsData.map(d => ({ ...d, isActive: true, createdAt: new Date(), updatedAt: new Date() })));
    const deptIds = Object.values(deptRes.insertedIds);

    const payGradesData = [
        { name: 'Grade 1', minSalary: 3000, maxSalary: 5000 },
        { name: 'Grade 2', minSalary: 5000, maxSalary: 8000 },
        { name: 'Grade 3', minSalary: 8000, maxSalary: 12000 },
        { name: 'Grade 4', minSalary: 12000, maxSalary: 25000 },
        { name: 'Grade 5', minSalary: 25000, maxSalary: 75000 },
    ];
    const pgRes = await db.collection('pay_grades').insertMany(payGradesData.map(p => ({ ...p, createdAt: new Date(), updatedAt: new Date() })));
    const pgIds = Object.values(pgRes.insertedIds);

    const posData = [];
    deptIds.forEach((dId, idx) => {
        const d = deptsData[idx];
        posData.push(
            { code: `${d.code}-HEAD`, title: `Head of ${d.name}`, departmentId: dId, gradeId: pgIds[4], isManagement: true },
            { code: `${d.code}-MGR`, title: `${d.name} Manager`, departmentId: dId, gradeId: pgIds[3], isManagement: true },
            { code: `${d.code}-SR`, title: `Senior ${d.name} Specialist`, departmentId: dId, gradeId: pgIds[2], isManagement: false },
            { code: `${d.code}-STAFF`, title: `${d.name} Associate`, departmentId: dId, gradeId: pgIds[1], isManagement: false }
        );
    });
    const posRes = await db.collection('positions').insertMany(posData.map(p => ({ ...p, isActive: true, createdAt: new Date(), updatedAt: new Date() })));
    const posIds = Object.values(posRes.insertedIds);

    // --- 2. EMPLOYEES & ROLES (Golden Accounts) ---
    const employees = [];
    const roles = [];
    const goldenManifest = [];

    const createEmp = (idx, dIdx, pIdx, roleNames, customNames = null) => {
        const id = new Types.ObjectId();
        const fName = customNames ? customNames.f : (['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah'][idx % 10]);
        const lName = customNames ? customNames.l : (['Smith', 'Doe', 'Johnson', 'Brown', 'Williams', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'][idx % 10]);
        const workEmail = customNames ? customNames.email || `${fName.toLowerCase()}.${lName.toLowerCase()}@company.com` : `emp${idx}.${lName.toLowerCase()}@company.com`;

        if (customNames) goldenManifest.push({ role: roleNames[0], email: workEmail, pass: 'password123' });

        employees.push({
            _id: id,
            employeeNumber: `EMP-${1000 + idx}`,
            firstName: fName,
            lastName: lName,
            fullName: `${fName} ${lName}`,
            nationalId: `NAT-${2000 + idx}`,
            password: passwordHash,
            gender: idx % 2 === 0 ? 'MALE' : 'FEMALE',
            dateOfHire: new Date(2020 + (idx % 4), idx % 12, (idx % 25) + 1),
            workEmail: workEmail,
            status: 'ACTIVE',
            primaryDepartmentId: deptIds[dIdx],
            primaryPositionId: posIds[dIdx * 4 + pIdx],
            skills: [
                { name: 'Leadership', category: 'Soft', level: 3, isVerified: true },
                { name: 'Strategy', category: 'Business', level: 4, isVerified: true }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        roles.push({
            employeeProfileId: id,
            roles: roleNames,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return id;
    };

    // Golden Manifest Mapping
    const adminId = createEmp(0, 0, 0, ['System Admin'], { f: 'Admin', l: 'Alpha', email: 'admin.alpha@company.com' });
    const hrMgrId = createEmp(1, 1, 1, ['HR Manager'], { f: 'Manager', l: 'HR', email: 'manager.hr@company.com' });
    const hrAdmId = createEmp(2, 1, 0, ['HR Admin'], { f: 'Admin', l: 'HR', email: 'admin.hr@company.com' });
    const deptHeadId = createEmp(3, 2, 0, ['department head'], { f: 'Head', l: 'Engineering', email: 'head.engineering@company.com' });
    const payMgrId = createEmp(4, 4, 1, ['Payroll Manager'], { f: 'Manager', l: 'Payroll', email: 'manager.payroll@company.com' });
    const paySpecId = createEmp(5, 4, 2, ['Payroll Specialist'], { f: 'Specialist', l: 'Payroll', email: 'specialist.payroll@company.com' });
    const finStaffId = createEmp(6, 4, 3, ['Finance Staff'], { f: 'Staff', l: 'Finance', email: 'staff.finance@company.com' });
    const legalAdmId = createEmp(7, 4, 0, ['Legal & Policy Admin'], { f: 'Admin', l: 'Legal', email: 'admin.legal@company.com' });
    const recruiterId = createEmp(8, 1, 2, ['Recruiter'], { f: 'Recruiter', l: 'Delta', email: 'recruiter.delta@company.com' });
    const hrEmpId = createEmp(9, 1, 3, ['HR Employee'], { f: 'Staff', l: 'HR', email: 'user.hr@company.com' });
    const stdEmpId = createEmp(10, 2, 3, ['department employee'], { f: 'User', l: 'Standard', email: 'user.standard@company.com' });

    // Ghost Employee (Active in Payroll, but has 0 Attendance)
    const ghostId = createEmp(99, 3, 3, ['department employee'], { f: 'Casper', l: 'Ghost', email: 'casper.ghost@company.com' });

    // Mass Data (70 more employees)
    for (let i = 20; i < 90; i++) {
        createEmp(i, i % 5, (i % 3) + 1, ['department employee']);
    }

    await db.collection('employee_profiles').insertMany(employees);
    const roleIdResult = await db.collection('employee_system_roles').insertMany(roles);

    // Cross-link accessProfileId
    for (let i = 0; i < employees.length; i++) {
        await db.collection('employee_profiles').updateOne(
            { _id: employees[i]._id },
            { $set: { accessProfileId: roleIdResult.insertedIds[i] } }
        );
    }
    console.log(`Created ${employees.length} Employees and matched System Roles.`);

    // --- 3. PAYROLL EXECUTION (12 Months) ---
    console.log('Generating 12 months of Payroll Runs and Payslips...');
    const runs = [];
    const payslips = [];
    const payDetails = [];

    // Setup Payroll Details for all
    employees.forEach(emp => {
        payDetails.push({
            employeeId: emp._id,
            baseSalary: 4000 + (Math.random() * 15000),
            bankName: 'National Bank',
            bankAccountNumber: 'EG' + Math.floor(Math.random() * 1000000000),
            createdAt: new Date()
        });
    });
    await db.collection('employee_payroll_details').insertMany(payDetails);

    for (let m = 0; m < 12; m++) {
        const date = new Date(2025, m, 28);
        const runId = `PR-2025-${(m + 1).toString().padStart(4, '0')}`;
        const run_id_obj = new Types.ObjectId();

        runs.push({
            _id: run_id_obj,
            runId,
            payrollPeriod: date,
            status: 'approved', // CORRECTED: Lowercase
            entity: 'Global Corp',
            employees: employees.length,
            exceptions: m === 5 ? 12 : 0, // Mock exceptions in June
            totalnetpay: employees.length * 8000,
            payrollSpecialistId: paySpecId,
            payrollManagerId: payMgrId,
            financeStaffId: finStaffId,
            paymentStatus: 'paid', // CORRECTED: Lowercase
            createdAt: date
        });

        employees.forEach(emp => {
            const detail = payDetails.find(d => d.employeeId.equals(emp._id));
            const base = detail.baseSalary;
            payslips.push({
                employeeId: emp._id,
                payrollRunId: run_id_obj,
                earningsDetails: {
                    baseSalary: base,
                    allowances: [{ name: 'Housing', amount: base * 0.1 }]
                },
                deductionsDetails: {
                    taxes: [{ name: 'Income Tax', amount: base * 0.15 }]
                },
                totalGrossSalary: base * 1.1,
                netPay: base * 0.95,
                paymentStatus: 'paid', // CORRECTED: Lowercase
                createdAt: date
            });
        });
    }
    await db.collection('payroll_runs').insertMany(runs);
    await db.collection('payslips').insertMany(payslips);

    // --- 4. ATTENDANCE & LEAVES (Pattern Analysis Ready) ---
    console.log('Fusing Attendance and Leave scenarios...');
    const attendance = [];
    const leaves = [];
    const today = new Date();

    // Leave Types
    const ltRes = await db.collection('leave_types').insertMany([
        { name: 'Annual', code: 'AL', daysPerYear: 21 },
        { name: 'Sick', code: 'SL', daysPerYear: 10 },
        { name: 'Casual', code: 'CL', daysPerYear: 7 }
    ]);
    const alId = ltRes.insertedIds[0];
    const slId = ltRes.insertedIds[1];

    employees.forEach((emp, eIdx) => {
        if (emp._id.equals(ghostId)) return; // No attendance for Ghost!

        // 60 Days of Attendance
        for (let d = 60; d >= 0; d--) {
            const date = new Date(today);
            date.setDate(date.getDate() - d);
            if (date.getDay() === 5 || date.getDay() === 6) continue;

            const checkIn = new Date(date);
            checkIn.setHours(8, eIdx % 5 === 0 ? 45 : 10, 0); // Some people are always late (Pattern!)

            attendance.push({
                employeeProfileId: emp._id, // Field name from my previous view_file (or attendance logs usually use employeeProfileId or employeeId?)
                // Wait, view_file showed 'attendance-record.schema.ts'. 
                // It had: @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: Employee.name }) employeeId;
                // It also had punches array.
                // But here I'm seeding 'attendance_logs' collection. 
                // Wait, schema file name is `attendance-record.schema.ts` but typical collection name is plural.
                // Let's assume 'attendance_records' is the collection name for the schema.
                // The seed uses 'attendance_logs' which might be from a different module or just legacy thought.
                // I will seed 'attendance_records' based on schema I saw.
                // Schema has `employeeId`, NOT `employeeProfileId`.
                // Schema has `totalWorkMinutes`.
                // Schema has `punches: [{ type: String, time: Date }]`.
                employeeId: emp._id,
                date: new Date(date.setHours(0, 0, 0, 0)), // Usually stored as date or part of punches
                punches: [
                    { type: 'CHECK_IN', time: checkIn },
                    { type: 'CHECK_OUT', time: new Date(new Date(checkIn).setHours(17, 0, 0)) }
                ],
                totalWorkMinutes: 480,
                status: (checkIn.getHours() === 8 && checkIn.getMinutes() > 30) ? 'LATE' : 'PRESENT',
                createdAt: new Date()
            });
        }

        // Anomaly: 3 Employees with "Monday Sickness"
        if (eIdx < 3) {
            for (let w = 0; w < 8; w++) {
                const monday = new Date(today);
                monday.setDate(monday.getDate() - (monday.getDay() + 1 + w * 7));
                leaves.push({
                    employeeId: emp._id,
                    leaveTypeId: slId,
                    dates: { from: monday, to: monday },
                    durationDays: 1,
                    status: 'APPROVED',
                    irregularPatternFlag: true // Explicitly flag for DS
                });
            }
        }
    });

    // Seeding attendance_records instead of logs, matching schema structure better
    await db.collection('attendance_records').insertMany(attendance);
    await db.collection('leave_requests').insertMany(leaves);

    // --- 5. PERFORMANCE SCIENCE (Trajectory Data) ---
    console.log('Building Performance History (3 Cycles)...');
    const tpltRes = await db.collection('appraisal_templates').insertOne({
        name: 'Standard Excellence',
        templateType: 'ANNUAL',
        criteria: [{ key: 'res', title: 'Results', weight: 100, maxScore: 5 }],
        isActive: true
    });
    const tId = tpltRes.insertedId;

    for (let yr of [2023, 2024, 2025]) {
        const cyclRes = await db.collection('appraisal_cycles').insertOne({
            name: `${yr} Performance Cycle`,
            status: yr === 2025 ? 'ACTIVE' : 'ARCHIVED',
            startDate: new Date(`${yr}-01-01`),
            endDate: new Date(`${yr}-12-31`)
        });
        const cId = cyclRes.insertedId;

        employees.forEach((emp, eIdx) => {
            const score = (eIdx % 10 < 2) ? (2 + (yr - 2023)) : (4 - (yr - 2023) * 0.5); // Rising stars vs Sinking ships
            if (yr < 2025) {
                db.collection('appraisal_records').insertOne({
                    employeeProfileId: emp._id,
                    cycleId: cId,
                    templateId: tId,
                    totalScore: score,
                    potentialScore: 3 + (eIdx % 3),
                    status: 'HR_PUBLISHED'
                });
            } else {
                db.collection('appraisal_assignments').insertOne({
                    employeeProfileId: emp._id,
                    cycleId: cId,
                    templateId: tId,
                    managerProfileId: hrMgrId,
                    status: 'IN_PROGRESS'
                });
            }
        });
    }

    // --- 6. RECRUITMENT & ONBOARDING ---
    console.log('Seeding Recruitment & Onboarding...');
    const jobReqs = [];
    const candidates = [];
    const applications = [];
    const onboardings = [];

    // Job Requisitions
    const requisitionTitles = ['Senior Backend Engineer', 'Product Designer', 'Sales Executive', 'HR Coordinator'];
    requisitionTitles.forEach((title, i) => {
        jobReqs.push({
            jobTitle: title,
            departmentId: deptIds[i % 5],
            status: i === 0 ? 'OPEN' : (i === 1 ? 'FILLED' : 'CLOSED'), // Varied status
            hiringManagerId: deptHeadId,
            positionsCount: 2,
            filledCount: i === 1 ? 2 : 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    });
    const reqRes = await db.collection('job_requisitions').insertMany(jobReqs);
    const reqIds = Object.values(reqRes.insertedIds);

    // Candidates & Applications
    for (let i = 0; i < 40; i++) {
        const cId = new Types.ObjectId();
        candidates.push({
            _id: cId,
            firstName: `Candidate${i}`,
            lastName: `Hopeful`,
            email: `candidate${i}@gmail.com`,
            phone: `+2010000000${i}`,
            createdAt: new Date()
        });

        applications.push({
            candidateId: cId,
            requisitionId: reqIds[i % reqIds.length],
            status: i < 5 ? 'OFFER_ACCEPTED' : (i < 15 ? 'INTERVIEWING' : 'APPLIED'),
            createdAt: new Date()
        });

        // Onboarding for hired candidates
        if (i < 5) {
            onboardings.push({
                candidateId: cId,
                employeeId: employees[20 + i]._id, // Link to some mass-generated employees
                status: 'IN_PROGRESS',
                departmentId: employees[20 + i].primaryDepartmentId,
                startDate: new Date(),
                tasks: [
                    { title: 'IT Setup', status: 'PENDING', assigneeId: adminId },
                    { title: 'HR Orientation', status: 'COMPLETED', assigneeId: hrAdmId }
                ]
            });
        }
    }
    await db.collection('candidates').insertMany(candidates);
    await db.collection('applications').insertMany(applications);
    await db.collection('onboardings').insertMany(onboardings);

    // --- 7. PAYROLL TRACKING (Claims & Disputes) ---
    console.log('Seeding Payroll Tracking (Claims, Disputes, Policy)...');

    // Policy
    await db.collection('pay_policies').insertOne({
        name: 'Standard Overtime',
        type: 'ALLOWANCE',
        description: '1.5x hourly rate for extra hours',
        isActive: true,
        createdAt: new Date()
    });

    // Claims
    const claims = [];
    employees.slice(0, 10).forEach(emp => {
        claims.push({
            employeeId: emp._id,
            claimType: 'Travel Reimbursement',
            amount: 150 + (Math.random() * 200),
            status: 'APPROVED',
            approvedBy: finStaffId,
            createdAt: new Date()
        });
    });
    await db.collection('claims').insertMany(claims);

    // Disputes (Hotspot in Engineering: deptIds[2])
    const disputes = [];
    const engEmployees = employees.filter(e => e.primaryDepartmentId.equals(deptIds[2]));

    // Create 15 disputes in Engineering (The Hotspot)
    engEmployees.slice(0, 15).forEach(emp => {
        disputes.push({
            issueType: 'SALARY_MISCALCULATION',
            description: 'My overtime was not calculated correctly for last month.',
            severity: 'HIGH',
            status: 'OPEN',
            employeeId: emp._id,
            assignedTo: paySpecId,
            month: '2025-06', // Focusing on a specific month
            createdAt: new Date()
        });
    });

    // A few random disputes elsewhere
    disputes.push({
        issueType: 'MISSING_ALLOWANCE',
        description: 'Transport allowance missing',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        employeeId: hrEmpId,
        assignedTo: payMgrId,
        createdAt: new Date()
    });

    await db.collection('disputes').insertMany(disputes);

    console.log('--- MASTER SEED: INTELLIGENCE LAYER CREATED ---');
    console.table(goldenManifest);
    process.exit(0);
}

seed().catch(err => {
    console.error('--- SEED FAILURE ---');
    console.error(JSON.stringify(err, null, 2));
    process.exit(1);
});

/**
 * Performance Management Seed Script
 * 
 * Database: employee (mongodb+srv://...mongodb.net/employee)
 * 
 * Prerequisites: Run seed-employee-org.js first
 * 
 * Creates:
 * - 5 Appraisal Templates (Annual, Semi-Annual, Probationary, Project, Ad-Hoc)
 * - 4 Appraisal Cycles (2 completed, 1 active, 1 planned)
 * - Appraisal Assignments for all eligible employees
 * - Appraisal Records with ratings and scores
 * - Appraisal Disputes with various resolutions
 * 
 * Run: node scripts/seeds/seed-performance.js
 */

const { MongoClient, ObjectId } = require('mongodb');

// =============================================================================
// CONFIGURATION
// =============================================================================
const MONGODB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/employee?appName=Cluster0';

// =============================================================================
// ENUMS (matching backend performance.enums.ts)
// =============================================================================
const AppraisalTemplateType = {
  ANNUAL: 'ANNUAL',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  PROBATIONARY: 'PROBATIONARY',
  PROJECT: 'PROJECT',
  AD_HOC: 'AD_HOC'
};

const AppraisalCycleStatus = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED'
};

const AppraisalAssignmentStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  PUBLISHED: 'PUBLISHED',
  ACKNOWLEDGED: 'ACKNOWLEDGED'
};

const AppraisalRecordStatus = {
  DRAFT: 'DRAFT',
  MANAGER_SUBMITTED: 'MANAGER_SUBMITTED',
  HR_PUBLISHED: 'HR_PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

const AppraisalDisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ADJUSTED: 'ADJUSTED',
  REJECTED: 'REJECTED'
};

const AppraisalRatingScaleType = {
  THREE_POINT: 'THREE_POINT',
  FIVE_POINT: 'FIVE_POINT',
  TEN_POINT: 'TEN_POINT'
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// =============================================================================
// APPRAISAL TEMPLATES DATA
// =============================================================================
const templateConfigs = [
  {
    name: 'Annual Performance Review',
    description: 'Comprehensive annual employee performance evaluation covering all key competencies and goals',
    templateType: AppraisalTemplateType.ANNUAL,
    ratingScale: {
      type: AppraisalRatingScaleType.FIVE_POINT,
      min: 1,
      max: 5,
      step: 1,
      labels: ['Unsatisfactory', 'Needs Improvement', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding']
    },
    criteria: [
      { key: 'job_knowledge', title: 'Job Knowledge & Skills', details: 'Technical competence and understanding of role requirements', weight: 20, maxScore: 5, required: true },
      { key: 'quality_work', title: 'Quality of Work', details: 'Accuracy, thoroughness, and consistency of work output', weight: 20, maxScore: 5, required: true },
      { key: 'productivity', title: 'Productivity & Efficiency', details: 'Volume of work and effective use of time', weight: 15, maxScore: 5, required: true },
      { key: 'communication', title: 'Communication', details: 'Clarity and effectiveness in verbal and written communication', weight: 15, maxScore: 5, required: true },
      { key: 'teamwork', title: 'Teamwork & Collaboration', details: 'Ability to work effectively with colleagues and contribute to team goals', weight: 15, maxScore: 5, required: true },
      { key: 'initiative', title: 'Initiative & Innovation', details: 'Proactive approach and creative problem-solving', weight: 10, maxScore: 5, required: true },
      { key: 'attendance', title: 'Attendance & Punctuality', details: 'Reliability and adherence to work schedule', weight: 5, maxScore: 5, required: true }
    ],
    instructions: 'Please rate each criterion objectively based on documented performance throughout the review period. Provide specific examples in comments.'
  },
  {
    name: 'Semi-Annual Check-in',
    description: 'Mid-year performance check-in focusing on progress and goal alignment',
    templateType: AppraisalTemplateType.SEMI_ANNUAL,
    ratingScale: {
      type: AppraisalRatingScaleType.FIVE_POINT,
      min: 1,
      max: 5,
      step: 1,
      labels: ['Below Target', 'Approaching Target', 'On Target', 'Above Target', 'Exceptional']
    },
    criteria: [
      { key: 'goal_progress', title: 'Goal Progress', details: 'Progress towards set objectives', weight: 30, maxScore: 5, required: true },
      { key: 'performance', title: 'Overall Performance', details: 'General work performance assessment', weight: 25, maxScore: 5, required: true },
      { key: 'development', title: 'Professional Development', details: 'Growth and skill improvement', weight: 25, maxScore: 5, required: true },
      { key: 'collaboration', title: 'Team Contribution', details: 'Collaboration and team support', weight: 20, maxScore: 5, required: true }
    ],
    instructions: 'Focus on progress since the last annual review. Identify areas for improvement before year-end.'
  },
  {
    name: 'Probationary Period Evaluation',
    description: 'Assessment for employees completing their probation period',
    templateType: AppraisalTemplateType.PROBATIONARY,
    ratingScale: {
      type: AppraisalRatingScaleType.THREE_POINT,
      min: 1,
      max: 3,
      step: 1,
      labels: ['Does Not Meet Standards', 'Meets Standards', 'Exceeds Standards']
    },
    criteria: [
      { key: 'job_fit', title: 'Job Fit & Competency', details: 'Suitability for the role and required skills', weight: 25, maxScore: 3, required: true },
      { key: 'learning', title: 'Learning Curve', details: 'Speed and quality of learning job requirements', weight: 25, maxScore: 3, required: true },
      { key: 'integration', title: 'Team Integration', details: 'How well the employee has integrated with the team', weight: 20, maxScore: 3, required: true },
      { key: 'reliability', title: 'Reliability', details: 'Dependability and consistency', weight: 15, maxScore: 3, required: true },
      { key: 'potential', title: 'Growth Potential', details: 'Potential for future development and advancement', weight: 15, maxScore: 3, required: true }
    ],
    instructions: 'Evaluate whether the employee should be confirmed, extended, or terminated after probation.'
  },
  {
    name: 'Project Performance Review',
    description: 'Evaluation based on specific project contributions and outcomes',
    templateType: AppraisalTemplateType.PROJECT,
    ratingScale: {
      type: AppraisalRatingScaleType.TEN_POINT,
      min: 1,
      max: 10,
      step: 1,
      labels: ['1-Poor', '2', '3', '4', '5-Average', '6', '7', '8', '9', '10-Excellent']
    },
    criteria: [
      { key: 'deliverables', title: 'Deliverable Quality', details: 'Quality and completeness of project deliverables', weight: 30, maxScore: 10, required: true },
      { key: 'timeline', title: 'Timeline Adherence', details: 'Meeting deadlines and milestones', weight: 25, maxScore: 10, required: true },
      { key: 'problem_solving', title: 'Problem Solving', details: 'Handling of challenges and obstacles', weight: 20, maxScore: 10, required: true },
      { key: 'stakeholder', title: 'Stakeholder Management', details: 'Communication and relationship with stakeholders', weight: 15, maxScore: 10, required: true },
      { key: 'documentation', title: 'Documentation', details: 'Quality of project documentation', weight: 10, maxScore: 10, required: true }
    ],
    instructions: 'Rate performance specifically within the context of the project. Reference project outcomes.'
  },
  {
    name: 'Ad-Hoc Performance Assessment',
    description: 'Quick performance snapshot for special circumstances',
    templateType: AppraisalTemplateType.AD_HOC,
    ratingScale: {
      type: AppraisalRatingScaleType.FIVE_POINT,
      min: 1,
      max: 5,
      step: 1,
      labels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
    },
    criteria: [
      { key: 'performance', title: 'Current Performance', details: 'Overall current performance level', weight: 40, maxScore: 5, required: true },
      { key: 'improvement', title: 'Improvement Areas', details: 'Areas needing attention', weight: 30, maxScore: 5, required: true },
      { key: 'strengths', title: 'Key Strengths', details: 'Notable strengths and contributions', weight: 30, maxScore: 5, required: true }
    ],
    instructions: 'Use for promotion considerations, transfers, or performance concerns requiring immediate documentation.'
  }
];

// =============================================================================
// RATING COMMENTS TEMPLATES
// =============================================================================
const strengthComments = [
  'Demonstrates exceptional technical expertise and problem-solving abilities',
  'Consistently delivers high-quality work with attention to detail',
  'Excellent communication skills and ability to explain complex concepts',
  'Shows strong leadership potential and mentors junior team members',
  'Proactive in identifying and resolving issues before they escalate',
  'Highly reliable and can be counted on to meet deadlines',
  'Adapts well to change and learns new skills quickly',
  'Positive attitude and contributes to team morale',
  'Takes ownership of projects and sees them through to completion',
  'Strong analytical skills and data-driven decision making'
];

const improvementComments = [
  'Could benefit from more proactive communication with stakeholders',
  'Should focus on time management and prioritization skills',
  'Encourage participation in professional development opportunities',
  'Would benefit from improved documentation practices',
  'Could take more initiative in team discussions',
  'Should work on delegating tasks more effectively',
  'Could improve attention to detail in deliverables',
  'Would benefit from building stronger cross-functional relationships',
  'Should focus on meeting deadlines more consistently',
  'Could work on presenting ideas more confidently'
];

const managerSummaryTemplates = [
  '{name} has been a valuable contributor this period. Overall performance is {rating} and shows {trend} trajectory.',
  'This review period, {name} demonstrated {rating} performance. Key achievements include consistent delivery and teamwork.',
  '{name} continues to show {rating} capabilities. Recommend continued focus on professional development.',
  'Overall, {name} has performed at a {rating} level. Particularly strong in {strength} areas.',
  '{name} has shown {rating} performance with notable improvements in collaboration and delivery quality.'
];

// =============================================================================
// DISPUTE REASONS
// =============================================================================
const disputeReasons = [
  'Rating does not reflect actual performance contributions',
  'Manager did not consider key achievements during the period',
  'Unfair comparison with peers in different circumstances',
  'Feedback was not provided during the review period',
  'Rating criteria was not clearly communicated beforehand',
  'External factors affecting performance were not considered',
  'Workload distribution was not equitable',
  'Training opportunities promised were not provided'
];

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================
async function seedPerformanceData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Verify employee data exists
    const employeeCount = await db.collection('employee_profiles').countDocuments();
    if (employeeCount === 0) {
      console.error('❌ No employees found. Please run seed-employee-org.js first.');
      process.exit(1);
    }
    console.log(`✅ Found ${employeeCount} employees`);
    
    // Get departments
    const departments = await db.collection('departments').find().toArray();
    const deptMap = Object.fromEntries(departments.map(d => [d._id.toString(), d]));
    console.log(`✅ Found ${departments.length} departments`);
    
    // Get employees with their positions
    const employees = await db.collection('employee_profiles').find({ 
      status: { $in: ['ACTIVE', 'ON_LEAVE', 'PROBATION'] }
    }).toArray();
    console.log(`✅ Found ${employees.length} eligible employees`);
    
    // Get position assignments to find managers
    const positionAssignments = await db.collection('position_assignments').find().toArray();
    const positions = await db.collection('positions').find().toArray();
    const positionMap = Object.fromEntries(positions.map(p => [p._id.toString(), p]));
    
    // Build employee -> manager mapping using position hierarchy
    const employeeManagerMap = {};
    for (const assignment of positionAssignments) {
      const position = positionMap[assignment.positionId?.toString()];
      if (position && position.reportsToPositionId) {
        // Find manager's assignment
        const managerAssignment = positionAssignments.find(
          pa => pa.positionId?.toString() === position.reportsToPositionId?.toString()
        );
        if (managerAssignment) {
          employeeManagerMap[assignment.employeeProfileId.toString()] = managerAssignment.employeeProfileId;
        }
      }
    }
    
    // Get access profiles to find HR Manager and department heads
    const accessProfiles = await db.collection('employee_system_roles').find().toArray();
    const accessProfileMap = Object.fromEntries(accessProfiles.map(ap => [ap.employeeProfileId?.toString(), ap]));
    
    // Get department heads for employees without direct managers
    const deptHeadMap = {};
    for (const employee of employees) {
      const accessProfile = accessProfileMap[employee._id.toString()];
      if (employee.primaryDepartmentId && accessProfile?.roles?.includes('department head')) {
        deptHeadMap[employee.primaryDepartmentId.toString()] = employee._id;
      }
    }
    
    // Find HR manager for publishing (by checking access_profiles roles)
    let hrManagerId = null;
    for (const employee of employees) {
      const accessProfile = accessProfileMap[employee._id.toString()];
      if (accessProfile?.roles?.includes('HR Manager')) {
        hrManagerId = employee._id;
        console.log(`✅ Found HR Manager: ${employee.firstName} ${employee.lastName} (${employee.workEmail})`);
        break;
      }
    }
    if (!hrManagerId) {
      hrManagerId = employees[0]._id;
      console.log('⚠️  HR Manager not found, using first employee as fallback');
    }
    
    // Find sample department employees from different departments for login
    const deptEmployeesByDept = {};
    for (const dept of departments) {
      deptEmployeesByDept[dept._id.toString()] = [];
    }
    for (const emp of employees) {
      const ap = accessProfileMap[emp._id.toString()];
      if (ap?.roles?.includes('department employee') && emp.status === 'ACTIVE' && emp.primaryDepartmentId) {
        const deptId = emp.primaryDepartmentId.toString();
        if (deptEmployeesByDept[deptId] && deptEmployeesByDept[deptId].length < 1) {
          deptEmployeesByDept[deptId].push(emp);
        }
      }
    }
    // Flatten to get one employee from each department
    const sampleEmployees = Object.values(deptEmployeesByDept).flat().filter(Boolean);
    
    console.log('\n📧 Sample Department Employee Logins (password: RoleUser@1234):');
    for (const emp of sampleEmployees) {
      console.log(`   - ${emp.workEmail} (${emp.firstName} ${emp.lastName}, Dept: ${departments.find(d => d._id.toString() === emp.primaryDepartmentId?.toString())?.name || 'N/A'})`);
    }
    
    // Clear existing performance data
    console.log('\n🗑️  Clearing existing performance data...');
    await Promise.all([
      db.collection('appraisal_templates').deleteMany({}),
      db.collection('appraisal_cycles').deleteMany({}),
      db.collection('appraisal_assignments').deleteMany({}),
      db.collection('appraisal_records').deleteMany({}),
      db.collection('appraisal_disputes').deleteMany({})
    ]);
    
    // ==========================================================================
    // CREATE APPRAISAL TEMPLATES
    // ==========================================================================
    console.log('\n📋 Creating appraisal templates...');
    const templateDocs = templateConfigs.map(config => ({
      _id: new ObjectId(),
      name: config.name,
      description: config.description,
      templateType: config.templateType,
      ratingScale: config.ratingScale,
      criteria: config.criteria,
      instructions: config.instructions,
      applicableDepartmentIds: departments.map(d => d._id), // Apply to all departments
      applicablePositionIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await db.collection('appraisal_templates').insertMany(templateDocs);
    console.log(`   Created ${templateDocs.length} templates`);
    
    const annualTemplate = templateDocs.find(t => t.templateType === AppraisalTemplateType.ANNUAL);
    const semiAnnualTemplate = templateDocs.find(t => t.templateType === AppraisalTemplateType.SEMI_ANNUAL);
    const probationTemplate = templateDocs.find(t => t.templateType === AppraisalTemplateType.PROBATIONARY);
    
    // ==========================================================================
    // CREATE APPRAISAL CYCLES
    // ==========================================================================
    console.log('\n📅 Creating appraisal cycles...');
    const cycles = [
      {
        _id: new ObjectId(),
        name: 'Annual Review 2024',
        description: 'Full year performance review for 2024',
        cycleType: AppraisalTemplateType.ANNUAL,
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-12-31'),
        managerDueDate: new Date('2024-12-15'),
        employeeAcknowledgementDueDate: new Date('2024-12-31'),
        templateAssignments: [{ templateId: annualTemplate._id, departmentIds: departments.map(d => d._id) }],
        status: AppraisalCycleStatus.ARCHIVED,
        publishedAt: new Date('2024-12-20'),
        closedAt: new Date('2024-12-31'),
        archivedAt: new Date('2025-01-15'),
        createdAt: new Date('2024-10-15'),
        updatedAt: new Date('2025-01-15')
      },
      {
        _id: new ObjectId(),
        name: 'Semi-Annual Review H1 2025',
        description: 'Mid-year performance check-in for H1 2025',
        cycleType: AppraisalTemplateType.SEMI_ANNUAL,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-07-15'),
        managerDueDate: new Date('2025-06-30'),
        employeeAcknowledgementDueDate: new Date('2025-07-15'),
        templateAssignments: [{ templateId: semiAnnualTemplate._id, departmentIds: departments.map(d => d._id) }],
        status: AppraisalCycleStatus.CLOSED,
        publishedAt: new Date('2025-07-05'),
        closedAt: new Date('2025-07-15'),
        createdAt: new Date('2025-05-15'),
        updatedAt: new Date('2025-07-15')
      },
      {
        _id: new ObjectId(),
        name: 'Annual Review 2025',
        description: 'Full year performance review for 2025',
        cycleType: AppraisalTemplateType.ANNUAL,
        startDate: new Date('2025-11-01'),
        endDate: new Date('2026-01-31'),
        managerDueDate: new Date('2025-12-15'),
        employeeAcknowledgementDueDate: new Date('2026-01-31'),
        templateAssignments: [{ templateId: annualTemplate._id, departmentIds: departments.map(d => d._id) }],
        status: AppraisalCycleStatus.ACTIVE,
        createdAt: new Date('2025-10-15'),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: 'Semi-Annual Review H1 2026',
        description: 'Mid-year performance check-in for H1 2026',
        cycleType: AppraisalTemplateType.SEMI_ANNUAL,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-07-15'),
        managerDueDate: new Date('2026-06-30'),
        employeeAcknowledgementDueDate: new Date('2026-07-15'),
        templateAssignments: [{ templateId: semiAnnualTemplate._id, departmentIds: departments.map(d => d._id) }],
        status: AppraisalCycleStatus.PLANNED,
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date()
      }
    ];
    
    await db.collection('appraisal_cycles').insertMany(cycles);
    console.log(`   Created ${cycles.length} cycles`);
    
    // ==========================================================================
    // CREATE APPRAISAL ASSIGNMENTS AND RECORDS
    // ==========================================================================
    console.log('\n📝 Creating appraisal assignments and records...');
    
    const allAssignments = [];
    const allRecords = [];
    const allDisputes = [];
    
    // Process each cycle
    for (const cycle of cycles) {
      const template = templateDocs.find(t => t.templateType === cycle.cycleType);
      if (!template) continue;
      
      let assignmentCount = 0;
      let recordCount = 0;
      
      for (const employee of employees) {
        // Skip department heads from being evaluated in some cycles (they get evaluated too but by exec)
        const deptId = employee.primaryDepartmentId?.toString();
        
        // Find manager for this employee
        let managerId = employeeManagerMap[employee._id.toString()];
        if (!managerId && deptId) {
          managerId = deptHeadMap[deptId];
        }
        if (!managerId) {
          // Use HR manager as fallback
          managerId = hrManagerId;
        }
        
        // Skip if employee is their own manager
        if (managerId?.toString() === employee._id.toString()) {
          continue;
        }
        
        const assignmentId = new ObjectId();
        
        // Determine assignment status based on cycle status
        let assignmentStatus;
        let submittedAt, publishedAt;
        
        if (cycle.status === AppraisalCycleStatus.ARCHIVED || cycle.status === AppraisalCycleStatus.CLOSED) {
          // Completed cycles - various final states
          const statusChance = Math.random();
          if (statusChance < 0.85) {
            assignmentStatus = AppraisalAssignmentStatus.ACKNOWLEDGED;
          } else if (statusChance < 0.95) {
            assignmentStatus = AppraisalAssignmentStatus.PUBLISHED;
          } else {
            assignmentStatus = AppraisalAssignmentStatus.SUBMITTED;
          }
          submittedAt = randomDate(cycle.startDate, cycle.managerDueDate);
          publishedAt = cycle.publishedAt;
        } else if (cycle.status === AppraisalCycleStatus.ACTIVE) {
          // Active cycle - various in-progress states
          const statusChance = Math.random();
          if (statusChance < 0.3) {
            assignmentStatus = AppraisalAssignmentStatus.NOT_STARTED;
          } else if (statusChance < 0.6) {
            assignmentStatus = AppraisalAssignmentStatus.IN_PROGRESS;
          } else if (statusChance < 0.85) {
            assignmentStatus = AppraisalAssignmentStatus.SUBMITTED;
            submittedAt = randomDate(cycle.startDate, new Date());
          } else {
            assignmentStatus = AppraisalAssignmentStatus.PUBLISHED;
            submittedAt = randomDate(cycle.startDate, daysAgo(7));
            publishedAt = randomDate(submittedAt, new Date());
          }
        } else {
          // Planned cycle - all not started
          assignmentStatus = AppraisalAssignmentStatus.NOT_STARTED;
        }
        
        const assignment = {
          _id: assignmentId,
          cycleId: cycle._id,
          templateId: template._id,
          employeeProfileId: employee._id,
          managerProfileId: managerId,
          departmentId: employee.primaryDepartmentId,
          status: assignmentStatus,
          assignedAt: cycle.startDate,
          dueDate: cycle.managerDueDate,
          submittedAt,
          publishedAt,
          createdAt: cycle.startDate,
          updatedAt: new Date()
        };
        
        allAssignments.push(assignment);
        assignmentCount++;
        
        // Create appraisal record for submitted/published/acknowledged assignments
        if ([AppraisalAssignmentStatus.SUBMITTED, AppraisalAssignmentStatus.PUBLISHED, AppraisalAssignmentStatus.ACKNOWLEDGED].includes(assignmentStatus)) {
          
          // Generate ratings for each criterion
          const ratings = template.criteria.map(criterion => {
            // Generate somewhat realistic rating distribution (normal-ish around 3-4)
            const baseRating = 2 + Math.floor(Math.random() * 2.5) + (Math.random() > 0.7 ? 1 : 0);
            const ratingValue = Math.min(criterion.maxScore, Math.max(1, baseRating));
            const weightedScore = (ratingValue / criterion.maxScore) * criterion.weight;
            
            return {
              key: criterion.key,
              title: criterion.title,
              ratingValue,
              ratingLabel: template.ratingScale.labels[ratingValue - 1] || `${ratingValue}`,
              weightedScore: Math.round(weightedScore * 100) / 100,
              comments: Math.random() > 0.5 ? randomChoice([
                'Good performance in this area',
                'Consistent delivery',
                'Shows improvement',
                'Meets expectations',
                'Room for growth',
                'Strong performance',
                'Could be better',
                'Excellent work'
              ]) : undefined
            };
          });
          
          // Calculate total score
          const totalScore = Math.round(ratings.reduce((sum, r) => sum + (r.weightedScore || 0), 0) * 100) / 100;
          
          // Determine overall rating label
          let overallRatingLabel;
          if (template.ratingScale.type === AppraisalRatingScaleType.FIVE_POINT) {
            if (totalScore >= 90) overallRatingLabel = 'Outstanding';
            else if (totalScore >= 75) overallRatingLabel = 'Exceeds Expectations';
            else if (totalScore >= 60) overallRatingLabel = 'Meets Expectations';
            else if (totalScore >= 40) overallRatingLabel = 'Needs Improvement';
            else overallRatingLabel = 'Unsatisfactory';
          } else if (template.ratingScale.type === AppraisalRatingScaleType.THREE_POINT) {
            if (totalScore >= 80) overallRatingLabel = 'Exceeds Standards';
            else if (totalScore >= 50) overallRatingLabel = 'Meets Standards';
            else overallRatingLabel = 'Does Not Meet Standards';
          } else {
            if (totalScore >= 80) overallRatingLabel = 'Excellent';
            else if (totalScore >= 60) overallRatingLabel = 'Good';
            else if (totalScore >= 40) overallRatingLabel = 'Average';
            else overallRatingLabel = 'Below Average';
          }
          
          // Determine record status
          let recordStatus;
          if (assignmentStatus === AppraisalAssignmentStatus.SUBMITTED) {
            recordStatus = AppraisalRecordStatus.MANAGER_SUBMITTED;
          } else if (assignmentStatus === AppraisalAssignmentStatus.PUBLISHED || assignmentStatus === AppraisalAssignmentStatus.ACKNOWLEDGED) {
            recordStatus = cycle.status === AppraisalCycleStatus.ARCHIVED 
              ? AppraisalRecordStatus.ARCHIVED 
              : AppraisalRecordStatus.HR_PUBLISHED;
          } else {
            recordStatus = AppraisalRecordStatus.DRAFT;
          }
          
          const employeeName = `${employee.firstName} ${employee.lastName}`;
          
          const record = {
            _id: new ObjectId(),
            assignmentId: assignment._id,
            cycleId: cycle._id,
            templateId: template._id,
            employeeProfileId: employee._id,
            managerProfileId: managerId,
            ratings,
            totalScore,
            overallRatingLabel,
            managerSummary: randomChoice(managerSummaryTemplates)
              .replace('{name}', employeeName)
              .replace('{rating}', overallRatingLabel.toLowerCase())
              .replace('{trend}', randomChoice(['positive', 'stable', 'improving']))
              .replace('{strength}', randomChoice(['technical', 'collaborative', 'leadership'])),
            strengths: randomChoice(strengthComments),
            improvementAreas: randomChoice(improvementComments),
            status: recordStatus,
            managerSubmittedAt: submittedAt,
            hrPublishedAt: publishedAt,
            publishedByEmployeeId: publishedAt ? hrManagerId : undefined,
            employeeViewedAt: assignmentStatus === AppraisalAssignmentStatus.ACKNOWLEDGED 
              ? randomDate(publishedAt || cycle.publishedAt, new Date()) 
              : undefined,
            employeeAcknowledgedAt: assignmentStatus === AppraisalAssignmentStatus.ACKNOWLEDGED 
              ? randomDate(publishedAt || cycle.publishedAt, new Date()) 
              : undefined,
            archivedAt: cycle.status === AppraisalCycleStatus.ARCHIVED ? cycle.archivedAt : undefined,
            createdAt: submittedAt || cycle.startDate,
            updatedAt: new Date()
          };
          
          // Update assignment with latest appraisal ID
          assignment.latestAppraisalId = record._id;
          
          allRecords.push(record);
          recordCount++;
          
          // Create disputes for some low-scoring published records (about 8%)
          if (recordStatus === AppraisalRecordStatus.HR_PUBLISHED && 
              totalScore < 60 && 
              Math.random() < 0.3) {
            
            const disputeStatus = randomChoice([
              AppraisalDisputeStatus.OPEN,
              AppraisalDisputeStatus.UNDER_REVIEW,
              AppraisalDisputeStatus.ADJUSTED,
              AppraisalDisputeStatus.REJECTED
            ]);
            
            const dispute = {
              _id: new ObjectId(),
              appraisalId: record._id,
              assignmentId: assignment._id,
              cycleId: cycle._id,
              raisedByEmployeeId: employee._id,
              reason: randomChoice(disputeReasons),
              details: 'I believe this rating does not accurately reflect my contributions and performance during this review period.',
              submittedAt: randomDate(publishedAt || cycle.publishedAt, new Date()),
              status: disputeStatus,
              assignedReviewerEmployeeId: hrManagerId,
              resolutionSummary: [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED].includes(disputeStatus)
                ? disputeStatus === AppraisalDisputeStatus.ADJUSTED
                  ? 'After review, the rating has been adjusted based on additional evidence provided.'
                  : 'After thorough review, the original rating stands as it accurately reflects the documented performance.'
                : undefined,
              resolvedAt: [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED].includes(disputeStatus)
                ? randomDate(daysAgo(30), new Date())
                : undefined,
              resolvedByEmployeeId: [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED].includes(disputeStatus)
                ? hrManagerId
                : undefined,
              createdAt: randomDate(publishedAt || cycle.publishedAt, new Date()),
              updatedAt: new Date()
            };
            
            allDisputes.push(dispute);
          }
        }
      }
      
      console.log(`   Cycle "${cycle.name}": ${assignmentCount} assignments, ${recordCount} records`);
    }
    
    // Bulk insert all data
    if (allAssignments.length > 0) {
      await db.collection('appraisal_assignments').insertMany(allAssignments);
    }
    if (allRecords.length > 0) {
      await db.collection('appraisal_records').insertMany(allRecords);
    }
    if (allDisputes.length > 0) {
      await db.collection('appraisal_disputes').insertMany(allDisputes);
    }
    
    console.log(`\n✅ Total: ${allAssignments.length} assignments, ${allRecords.length} records, ${allDisputes.length} disputes`);
    
    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE SEED SUMMARY');
    console.log('='.repeat(60));
    console.log(`Templates:   ${templateDocs.length}`);
    console.log(`Cycles:      ${cycles.length} (${cycles.filter(c => c.status === AppraisalCycleStatus.ARCHIVED).length} archived, ${cycles.filter(c => c.status === AppraisalCycleStatus.CLOSED).length} closed, ${cycles.filter(c => c.status === AppraisalCycleStatus.ACTIVE).length} active, ${cycles.filter(c => c.status === AppraisalCycleStatus.PLANNED).length} planned)`);
    console.log(`Assignments: ${allAssignments.length}`);
    console.log(`Records:     ${allRecords.length}`);
    console.log(`Disputes:    ${allDisputes.length}`);
    console.log('='.repeat(60));
    
    // Show cycle breakdown
    console.log('\n📅 Cycle Details:');
    for (const cycle of cycles) {
      const cycleAssignments = allAssignments.filter(a => a.cycleId.toString() === cycle._id.toString());
      const cycleRecords = allRecords.filter(r => r.cycleId.toString() === cycle._id.toString());
      const avgScore = cycleRecords.length > 0 
        ? (cycleRecords.reduce((sum, r) => sum + r.totalScore, 0) / cycleRecords.length).toFixed(1)
        : 'N/A';
      console.log(`   ${cycle.name}:`);
      console.log(`      Status: ${cycle.status}, Assignments: ${cycleAssignments.length}, Records: ${cycleRecords.length}, Avg Score: ${avgScore}`);
    }
    
    // Show login credentials
    console.log('\n' + '='.repeat(60));
    console.log('🔐 LOGIN CREDENTIALS (password: RoleUser@1234)');
    console.log('='.repeat(60));
    console.log('\nAdmin Accounts:');
    console.log('   - hr.manager@company.com      → HR Manager (publish appraisals, resolve disputes)');
    console.log('   - hr.employee@company.com     → HR Employee (view analytics)');
    console.log('   - dept.head@company.com       → Department Head (rate team members)');
    console.log('\nTo view YOUR OWN performance as an employee:');
    for (const emp of sampleEmployees) {
      const deptName = departments.find(d => d._id.toString() === emp.primaryDepartmentId?.toString())?.name || 'N/A';
      console.log(`   - ${emp.workEmail.padEnd(40)} → ${deptName} dept`);
    }
    console.log('='.repeat(60));
    
    console.log('\n✅ Performance data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding performance data:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the seed
seedPerformanceData().catch(console.error);

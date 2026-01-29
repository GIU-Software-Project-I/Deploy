import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from '../services/onboarding.service';
import {CreateOnboardingDto, CreateOnboardingTaskDto, UpdateTaskStatusDto, UploadDocumentDto, ReserveEquipmentDto, ProvisionAccessDto, TriggerPayrollInitiationDto, ScheduleAccessRevocationDto, CancelOnboardingDto,} from '../dto/onboarding';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';

@ApiTags('Onboarding')
@ApiBearerAuth('access-token')
@Controller('onboarding')
//@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    // ============================================================
    // Candidate Document Upload - Initiate Onboarding Process
    // User Story: As a Candidate, I want to upload signed contract and
    // candidate required forms and templates to initiate the onboarding process.
    // ============================================================

    @Get('candidate/:candidateId/required-documents')
    //@Roles(SystemRole.JOB_CANDIDATE, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'Get required document templates for candidate',
        description: 'Returns list of required documents for onboarding with upload status. Candidates use this to see what documents they need to upload.',
    })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Required documents list with upload status' })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    async getRequiredDocumentTemplates(@Param('candidateId') candidateId: string) {
        return this.onboardingService.getRequiredDocumentTemplates(candidateId);
    }

    @Post('candidate/:candidateId/upload-document')
    //@Roles(SystemRole.JOB_CANDIDATE)
    @ApiOperation({
        summary: 'Candidate upload signed contract and forms',
        description: 'As a Candidate, I want to upload signed contract and candidate required forms and templates to initiate the onboarding process. Candidates can replace existing documents.',
    })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiBody({ type: UploadDocumentDto })
    @ApiResponse({ status: 201, description: 'Document uploaded/replaced successfully with onboarding readiness status' })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    async uploadCandidateDocument(
        @Param('candidateId') candidateId: string,
        @Body() dto: UploadDocumentDto,
    ) {
        // Ensure the ownerId matches the candidateId from the URL
        dto.ownerId = candidateId;
        return this.onboardingService.uploadCandidateDocument(dto);
    }

    @Get('candidate/:candidateId/document-progress')
    //@Roles(SystemRole.JOB_CANDIDATE, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'Get document upload progress for candidate',
        description: 'Returns progress of document uploads for candidate with percentage completion and list of missing documents.',
    })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Document upload progress' })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    async getCandidateDocumentProgress(@Param('candidateId') candidateId: string) {
        return this.onboardingService.getCandidateDocumentProgress(candidateId);
    }

    @Get('candidate/:candidateId/eligibility')
    //@Roles(SystemRole.JOB_CANDIDATE, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'Check onboarding eligibility for candidate',
        description: 'Validates if candidate has all requirements met to initiate onboarding: signed contract and all required documents uploaded.',
    })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Eligibility status with reasons if not eligible' })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    async validateOnboardingEligibility(@Param('candidateId') candidateId: string) {
        return this.onboardingService.validateOnboardingEligibility(candidateId);
    }

    @Delete('candidate/:candidateId/documents/:documentId')
    //@Roles(SystemRole.JOB_CANDIDATE, SystemRole.HR_MANAGER)
    @ApiOperation({
        summary: 'Delete candidate document',
        description: 'Delete a document uploaded by candidate to allow re-upload of corrected version.',
    })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiParam({ name: 'documentId', description: 'Document ID to delete' })
    @ApiResponse({ status: 200, description: 'Document deleted successfully' })
    @ApiResponse({ status: 404, description: 'Document not found or does not belong to candidate' })
    async deleteCandidateDocument(
        @Param('candidateId') candidateId: string,
        @Param('documentId') documentId: string,
    ) {
        return this.onboardingService.deleteCandidateDocument(candidateId, documentId);
    }

    // ============================================================
    // ONB-001: Create Onboarding Task Checklists
    // ============================================================

    @Post()
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'ONB-001: Create onboarding checklist',
        description: 'HR Manager creates onboarding task checklists for new hires. BR 8, 11: Customizable checklists with department-specific tasks.',
    })
    @ApiBody({ type: CreateOnboardingDto })
    @ApiResponse({ status: 201, description: 'Onboarding checklist created successfully' })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 409, description: 'Onboarding checklist already exists' })
    async createOnboarding(@Body() dto: CreateOnboardingDto) {
        return this.onboardingService.createOnboarding(dto);
    }

    @Get()
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'Get all onboarding checklists',
        description: 'HR Manager views all onboarding checklists',
    })
    @ApiResponse({ status: 200, description: 'List of onboarding checklists' })
    async getAllOnboardings() {
        return this.onboardingService.getAllOnboardings();
    }

    // ============================================================
    // IMPORTANT: Static routes must come BEFORE parameterized routes
    // These routes must be defined before @Get(':id')
    // ============================================================

    @Get('pending-provisioning')
    //@Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
    @ApiOperation({
        summary: 'ONB-009: Get employees pending access provisioning',
        description: 'System Admin views list of new hires who need system access provisioned. Sorted by start date.',
    })
    @ApiResponse({ status: 200, description: 'List of employees pending provisioning' })
    async getEmployeesPendingProvisioning() {
        return this.onboardingService.getEmployeesPendingProvisioning();
    }

    @Get('pending-equipment')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-012: Get employees pending equipment reservation',
        description: 'HR Employee views list of new hires who need equipment, desk, and access cards reserved. Sorted by start date.',
    })
    @ApiResponse({ status: 200, description: 'List of employees pending equipment reservation' })
    async getEmployeesPendingEquipment() {
        return this.onboardingService.getEmployeesPendingEquipment();
    }

    @Get(':id')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'Get onboarding by ID',
        description: 'Retrieve specific onboarding checklist with full details',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiResponse({ status: 200, description: 'Onboarding details' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async getOnboardingById(@Param('id') id: string) {
        return this.onboardingService.getOnboardingById(id);
    }

    @Post(':id/tasks')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'Add task to onboarding checklist',
        description: 'Add a new task to existing onboarding checklist',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiBody({ type: CreateOnboardingTaskDto })
    @ApiResponse({ status: 200, description: 'Task added successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async addTask(
        @Param('id') id: string,
        @Body() dto: CreateOnboardingTaskDto,
    ) {
        return this.onboardingService.addTask(id, dto);
    }

    @Patch(':id/tasks/:taskName')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'ONB-001 (BR 8): Update task in onboarding checklist',
        description: 'HR Manager can customize checklist by modifying task details (name, department, deadline, notes).',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiParam({ name: 'taskName', description: 'Current task name' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'New task name' },
                department: { type: 'string', description: 'Department responsible' },
                deadline: { type: 'string', format: 'date-time', description: 'Task deadline' },
                notes: { type: 'string', description: 'Additional notes' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Task updated successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding or task not found' })
    @ApiResponse({ status: 400, description: 'Cannot modify completed onboarding' })
    async updateTask(
        @Param('id') id: string,
        @Param('taskName') taskName: string,
        @Body() updateData: { name?: string; department?: string; deadline?: string; notes?: string },
    ) {
        return this.onboardingService.updateTask(id, taskName, updateData);
    }

    @Delete(':id/tasks/:taskName')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-001 (BR 8): Delete task from onboarding checklist',
        description: 'HR Manager can customize checklist by removing unnecessary tasks. Cannot delete completed tasks.',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiParam({ name: 'taskName', description: 'Task name to delete' })
    @ApiResponse({ status: 200, description: 'Task deleted successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding or task not found' })
    @ApiResponse({ status: 400, description: 'Cannot delete from completed onboarding or completed task' })
    async deleteTask(
        @Param('id') id: string,
        @Param('taskName') taskName: string,
    ) {
        return this.onboardingService.deleteTask(id, taskName);
    }


    // ============================================================
    // ONB-002: Access Signed Contract Details
    // ============================================================

    @Get('contracts/pending-employee-creation')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
    @ApiOperation({
        summary: 'ONB-002: Get signed contracts pending employee creation',
        description: 'HR Manager accesses signed contracts to create employee profiles. BR 17(a, b): Contract-based employee creation.',
    })
    @ApiResponse({ status: 200, description: 'List of signed contracts pending employee creation' })
    async getSignedContractsForOnboarding() {
        return this.onboardingService.getSignedContractsForOnboarding();
    }

    @Get('contracts/:contractId')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'ONB-002: Get signed contract details',
        description: 'HR Manager accesses signed contract detail to create employee profile. BR 17(a, b): Uses contract data from Recruitment.',
    })
    @ApiParam({ name: 'contractId', description: 'Contract ID' })
    @ApiResponse({ status: 200, description: 'Contract details' })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 400, description: 'Contract not fully signed' })
    async getContractDetails(@Param('contractId') contractId: string) {
        return this.onboardingService.getContractDetails(contractId);
    }

    @Post('contracts/:contractId/create-employee')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-002: Create employee profile from signed contract',
        description: 'HR Manager creates employee profile from signed contract details. BR 17(a, b): Extracts role, salary, benefits from contract.',
    })
    @ApiParam({ name: 'contractId', description: 'Contract ID' })
    @ApiResponse({ status: 201, description: 'Employee profile created successfully with temporary password' })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 400, description: 'Contract not fully signed or employee already exists' })
    async createEmployeeFromContract(@Param('contractId') contractId: string) {
        return this.onboardingService.createEmployeeFromContract(contractId);
    }

    // ============================================================
    // ONB-004: View Onboarding Steps (Tracker)
    // ============================================================

    @Get('employee/:employeeId')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'ONB-004: View onboarding tracker',
        description: 'New Hire views their onboarding steps in a tracker. BR 11(a, b): Workflow with department-specific tasks.',
    })
    @ApiParam({ name: 'employeeId', description: 'employee ID' })
    @ApiResponse({ status: 200, description: 'Onboarding tracker details' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async getOnboardingByEmployeeId(@Param('employeeId') employeeId: string) {
        return this.onboardingService.getOnboardingByEmployeeId(employeeId);
    }

    @Get('employee/:employeeId/tracker')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-004: Get detailed onboarding tracker',
        description: 'New Hire views onboarding steps grouped by status and department. BR 11(a, b): Includes next task to complete and progress summary.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiResponse({ status: 200, description: 'Detailed tracker with tasks grouped by status and department' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async getOnboardingTracker(@Param('employeeId') employeeId: string) {
        return this.onboardingService.getOnboardingTracker(employeeId);
    }

    @Post('employee/:employeeId/tasks/:taskName/start')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-004: Start onboarding task',
        description: 'New Hire marks a task as in-progress to track what they are working on.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiParam({ name: 'taskName', description: 'Task name to start' })
    @ApiResponse({ status: 200, description: 'Task started successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding or task not found' })
    @ApiResponse({ status: 400, description: 'Task already completed or onboarding completed' })
    async startTask(
        @Param('employeeId') employeeId: string,
        @Param('taskName') taskName: string,
    ) {
        return this.onboardingService.startTask(employeeId, taskName);
    }

    @Post('employee/:employeeId/tasks/:taskName/complete')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-004: Complete onboarding task',
        description: 'New Hire marks a task as completed. Optionally links a document to the task.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiParam({ name: 'taskName', description: 'Task name to complete' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                documentId: { type: 'string', description: 'Optional document ID to link to task' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Task completed successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding or task not found' })
    @ApiResponse({ status: 400, description: 'Task already completed or onboarding completed' })
    async completeTask(
        @Param('employeeId') employeeId: string,
        @Param('taskName') taskName: string,
        @Body('documentId') documentId?: string,
    ) {
        return this.onboardingService.completeTask(employeeId, taskName, documentId);
    }

    @Get(':id/progress')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'Get onboarding progress',
        description: 'View progress statistics for onboarding checklist',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiResponse({ status: 200, description: 'Progress statistics' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async getOnboardingProgress(@Param('id') id: string) {
        return this.onboardingService.getOnboardingProgress(id);
    }

    @Patch(':id/tasks/:taskName/status')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'Update task status',
        description: 'Update status of individual onboarding task',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiParam({ name: 'taskName', description: 'Task name' })
    @ApiBody({ type: UpdateTaskStatusDto })
    @ApiResponse({ status: 200, description: 'Task status updated successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding or task not found' })
    async updateTaskStatus(
        @Param('id') id: string,
        @Param('taskName') taskName: string,
        @Body() dto: UpdateTaskStatusDto,
    ) {
        return this.onboardingService.updateTaskStatus(id, taskName, dto);
    }

    // ============================================================
    // ONB-005: Reminders and Notifications
    // ============================================================

    @Get('employee/:employeeId/pending-tasks')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'ONB-005: Get pending tasks with reminders',
        description: 'New Hire receives reminders for pending and overdue tasks. BR 12: Track reminders and task assignments.',
    })
    @ApiParam({ name: 'employeeId', description: 'employee ID' })
    @ApiResponse({ status: 200, description: 'Pending and overdue tasks' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async getPendingTasks(@Param('employeeId') employeeId: string) {
        return this.onboardingService.getPendingTasks(employeeId);
    }

    @Get('employee/:employeeId/pending-tasks/quiet')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-005: Get pending tasks without sending reminders',
        description: 'Get pending, in-progress, overdue tasks and upcoming deadlines without triggering notifications.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiResponse({ status: 200, description: 'Pending tasks with upcoming deadlines' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async getPendingTasksQuiet(@Param('employeeId') employeeId: string) {
        return this.onboardingService.getPendingTasksWithoutReminders(employeeId);
    }

    @Post('employee/:employeeId/send-reminders')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-005: Send task reminders to employee',
        description: 'Send reminders for all pending/overdue tasks to specific employee. BR 12: Controlled reminder sending.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiResponse({ status: 200, description: 'Reminders sent with delivery status' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    async sendTaskReminders(@Param('employeeId') employeeId: string) {
        return this.onboardingService.sendTaskReminders(employeeId);
    }

    @Post('send-batch-reminders')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-005: Send batch reminders to all employees',
        description: 'Send reminders to all employees with incomplete onboarding. BR 12: Batch reminder processing.',
    })
    @ApiResponse({ status: 200, description: 'Batch reminders sent with summary' })
    async sendBatchReminders() {
        return this.onboardingService.sendBatchReminders();
    }

    // ============================================================
    // ONB-007: Upload Documents
    // ============================================================

    @Post('documents')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.JOB_CANDIDATE)
    @ApiOperation({
        summary: 'ONB-007: Upload compliance documents',
        description: 'New Hire uploads documents (ID, contracts, certifications). BR 7: Documents collected before first working day.',
    })
    @ApiBody({ type: UploadDocumentDto })
    @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
    async uploadDocument(@Body() dto: UploadDocumentDto) {
        return this.onboardingService.uploadDocument(dto);
    }

    @Post('employee/:employeeId/documents')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-007: Upload new hire document with task linking',
        description: 'New Hire uploads document and optionally links it to an onboarding task. BR 7: Documents collected and verified before first working day.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['type', 'filePath'],
            properties: {
                type: { type: 'string', enum: ['cv', 'contract', 'id', 'certificate', 'resignation'], description: 'Document type' },
                filePath: { type: 'string', description: 'File path or URL' },
                taskName: { type: 'string', description: 'Optional task name to link document' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Document uploaded and optionally linked to task' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async uploadNewHireDocument(
        @Param('employeeId') employeeId: string,
        @Body() body: { type: string; filePath: string; taskName?: string },
    ) {
        const dto: UploadDocumentDto = {
            ownerId: employeeId,
            type: body.type as any,
            filePath: body.filePath,
        };
        return this.onboardingService.uploadNewHireDocument(employeeId, dto, body.taskName);
    }

    @Get('employee/:employeeId/documents')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-007: Get new hire documents',
        description: 'Get all documents uploaded by new hire with required document checklist. BR 7: Track document collection status.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiResponse({ status: 200, description: 'Documents with required checklist status' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async getNewHireDocuments(@Param('employeeId') employeeId: string) {
        return this.onboardingService.getNewHireDocuments(employeeId);
    }

    @Get('documents/owner/:ownerId')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'Get documents by owner',
        description: 'Retrieve all documents uploaded by employee/candidate',
    })
    @ApiParam({ name: 'ownerId', description: 'Owner ID (employee/candidate)' })
    @ApiResponse({ status: 200, description: 'List of documents' })
    async getDocumentsByOwner(@Param('ownerId') ownerId: string) {
        return this.onboardingService.getDocumentsByOwner(ownerId);
    }

    @Patch(':id/tasks/:taskName/document')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({
        summary: 'Link document to task',
        description: 'Associate uploaded document with onboarding task',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiParam({ name: 'taskName', description: 'Task name' })
    @ApiBody({ schema: { properties: { documentId: { type: 'string' } } } })
    @ApiResponse({ status: 200, description: 'Document linked successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding or task not found' })
    async linkDocumentToTask(
        @Param('id') id: string,
        @Param('taskName') taskName: string,
        @Body('documentId') documentId: string,
    ) {
        return this.onboardingService.linkDocumentToTask(id, taskName, documentId);
    }

    // ============================================================
    // ONB-009: Provision System Access
    // ============================================================

    @Post('provision-access')
    //@Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
    @ApiOperation({
        summary: 'ONB-009: Provision system access',
        description: 'System Admin provisions system access (payroll, email, internal systems). BR 9(b): Auto IT tasks for email, laptop, system access. Updates onboarding task status.',
    })
    @ApiBody({ type: ProvisionAccessDto })
    @ApiResponse({ status: 200, description: 'System access provisioned successfully' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async provisionSystemAccess(@Body() dto: ProvisionAccessDto) {
        return this.onboardingService.provisionSystemAccess(dto);
    }

    // ============================================================
    // ONB-012: Reserve Equipment and Resources
    // ============================================================


    @Post('reserve-equipment')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-012: Reserve equipment and resources',
        description: 'HR employee reserves equipment, desk and access cards for new hires. BR 9(c): Auto Admin tasks for workspace, ID badge. Updates onboarding task status.',
    })
    @ApiBody({ type: ReserveEquipmentDto })
    @ApiResponse({ status: 200, description: 'Equipment and resources reserved successfully' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async reserveEquipment(@Body() dto: ReserveEquipmentDto) {
        return this.onboardingService.reserveEquipment(dto);
    }

    // ============================================================
    // ONB-013: Schedule Access Revocation
    // ============================================================

    @Post('schedule-access-revocation')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'ONB-013: Schedule automated access revocation',
        description: 'HR Manager schedules automated account provisioning and revocation. BR 9(b): IT allocation automated. BR 20: Links to Offboarding for security control.',
    })
    @ApiBody({ type: ScheduleAccessRevocationDto })
    @ApiResponse({ status: 200, description: 'Access revocation scheduled successfully' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async scheduleAccessRevocation(@Body() dto: ScheduleAccessRevocationDto) {
        return this.onboardingService.scheduleAccessRevocation(dto);
    }

    // ============================================================
    // ONB-018: Trigger Payroll Initiation
    // ============================================================

    @Post('trigger-payroll-initiation')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
    @ApiOperation({
        summary: 'ONB-018: Trigger payroll initiation',
        description: 'HR Manager triggers automatic payroll initiation based on contract signing. BR 9(a): Auto HR tasks for payroll & benefits. REQ-PY-23.',
    })
    @ApiBody({ type: TriggerPayrollInitiationDto })
    @ApiResponse({ status: 200, description: 'Payroll initiation triggered successfully' })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    async triggerPayrollInitiation(@Body() dto: TriggerPayrollInitiationDto) {
        return this.onboardingService.triggerPayrollInitiation(dto);
    }

    // ============================================================
    // ONB-019: Process Signing Bonuses
    // ============================================================

    @Post('contracts/:contractId/process-signing-bonus')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
    @ApiOperation({
        summary: 'ONB-019: Process signing bonus',
        description: 'HR Manager processes signing bonuses from contract. BR 9(a): Bonuses as distinct payroll components. REQ-PY-27.',
    })
    @ApiParam({ name: 'contractId', description: 'Contract ID' })
    @ApiResponse({ status: 200, description: 'Signing bonus processed successfully' })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 400, description: 'No signing bonus in contract' })
    async processSigningBonus(@Param('contractId') contractId: string) {
        return this.onboardingService.processSigningBonus(contractId);
    }

    // ============================================================
    // ONB-020: Cancel Onboarding (No-Show)
    // ============================================================

    @Post(':id/cancel')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Cancel onboarding (No-Show)',
        description: 'BR20: System allows onboarding cancellation/termination of employee profile in case of no-show.',
    })
    @ApiParam({ name: 'id', description: 'Onboarding ID' })
    @ApiBody({ type: CancelOnboardingDto })
    @ApiResponse({ status: 200, description: 'Onboarding cancelled successfully' })
    @ApiResponse({ status: 404, description: 'Onboarding not found' })
    @ApiResponse({ status: 400, description: 'Cannot cancel completed onboarding' })
    async cancelOnboarding(
        @Param('id') id: string,
        @Body() dto: CancelOnboardingDto,
    ) {
        return this.onboardingService.cancelOnboarding(id, dto);
    }
}

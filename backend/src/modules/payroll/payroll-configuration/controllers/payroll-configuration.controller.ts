import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpStatus,
    HttpCode,
    UsePipes,
    ValidationPipe,
    Put,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '../../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../../common/guards/authorization-guard';
import { Roles } from '../../../common/decorators/roles-decorator';
import { SystemRole } from '../../../employee/enums/employee-profile.enums';
import { PayrollConfigurationService } from '../services/payroll-configuration.service';
import { CreatePayrollPolicyDto } from '../dto/create-payroll-policy.dto';
import { UpdatePayrollPolicyDto } from '../dto/update-payroll-policy.dto';
import { QueryPayrollPolicyDto } from '../dto/query-payroll-policy.dto';
import { ApprovePayrollPolicyDto } from '../dto/approve-payroll-policy.dto';
import { CreatePayTypeDto } from '../dto/create-pay-type.dto';
import { UpdatePayTypeDto } from '../dto/update-pay-type.dto';
import { QueryPayTypeDto } from '../dto/query-pay-type.dto';
import { ApprovePayTypeDto } from '../dto/approve-pay-type.dto';
import { CreateAllowanceDto } from '../dto/create-allowance.dto';
import { UpdateAllowanceDto } from '../dto/update-allowance.dto';
import { QueryAllowanceDto } from '../dto/query-allowance.dto';
import { ApproveAllowanceDto } from '../dto/approve-allowance.dto';
import { CreateSigningBonusDto } from '../dto/create-signing-bonus.dto';
import { UpdateSigningBonusDto } from '../dto/update-signing-bonus.dto';
import { QuerySigningBonusDto } from '../dto/query-signing-bonus.dto';
import { ApproveSigningBonusDto } from '../dto/approve-signing-bonus.dto';
import { CreateTerminationBenefitDto } from '../dto/create-termination-benefit.dto';
import { UpdateTerminationBenefitDto } from '../dto/update-termination-benefit.dto';
import { QueryTerminationBenefitDto } from '../dto/query-termination-benefit.dto';
import { ApproveTerminationBenefitDto } from '../dto/approve-termination-benefit.dto';
import { CreateTaxRuleDto } from '../dto/create-tax-rule.dto';
import { UpdateTaxRuleDto } from '../dto/update-tax-rule.dto';
import { ApproveTaxRuleDto } from '../dto/approve-tax-rule.dto';
import { CreateInsuranceDto } from '../dto/create-insurance.dto';
import { UpdateInsuranceDto } from '../dto/update-insurance.dto';
import { ApproveInsuranceDto } from '../dto/approve-insurance.dto';
import { UpdateCompanyWideSettingsDto } from '../dto/update-company-settings.dto';
import { ApproveConfigDto } from '../dto/approve-config.dto';
import { CreatePayGradeDto } from '../dto/create-paygrade.dto';
import { UpdatePayGradeDto } from '../dto/update-paygrade.dto';

@Controller('payroll-configuration-requirements')
//@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PayrollConfigurationController {
    constructor(
        private readonly payrollConfigService: PayrollConfigurationService,
    ) {}

    // ========== LAMA'S TAX RULES ENDPOINTS ==========
    @Post('tax-rules')
    @Roles(SystemRole.LEGAL_POLICY_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    createTaxRule(@Body() dto: CreateTaxRuleDto) {
        return this.payrollConfigService.createTaxRule(dto);
    }

    @Get('tax-rules')
    @HttpCode(HttpStatus.OK)
    getTaxRules() {
        return this.payrollConfigService.getTaxRules();
    }

    @Get('tax-rules/:id')
    @HttpCode(HttpStatus.OK)
    getTaxRuleById(@Param('id') id: string) {
        return this.payrollConfigService.getTaxRuleById(id);
    }

    @Patch('tax-rules/:id')
    @Roles(SystemRole.PAYROLL_MANAGER , SystemRole.LEGAL_POLICY_ADMIN)
    @HttpCode(HttpStatus.OK)
    updateLegalRule(@Param('id') id: string, @Body() dto: UpdateTaxRuleDto) {
        return this.payrollConfigService.updateLegalRule(id, dto);
    }

    @Patch('tax-rules/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    approveTaxRule(@Param('id') id: string, @Body() dto: ApproveTaxRuleDto) {
        return this.payrollConfigService.approveTaxRule(id, dto);
    }

    @Delete('tax-rules/:id')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    deleteTaxRule(@Param('id') id: string) {
        return this.payrollConfigService.deleteTaxRule(id);
    }

    @Patch('tax-rules/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    rejectTaxRule(@Param('id') id: string, @Body() dto: ApproveTaxRuleDto) {
        return this.payrollConfigService.rejectTaxRule(id, dto);
    }

    // ========== LAMA'S INSURANCE BRACKETS ENDPOINTS ==========
    @Post('insurance-brackets')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    createInsurance(@Body() dto: CreateInsuranceDto) {
        return this.payrollConfigService.createInsuranceBracket(dto);
    }

    @Get('insurance-brackets')
    @HttpCode(HttpStatus.OK)
    getInsuranceBrackets() {
        return this.payrollConfigService.getInsuranceBrackets();
    }

    @Get('insurance-brackets/:id')
    @HttpCode(HttpStatus.OK)
    getInsuranceBracketById(@Param('id') id: string) {
        return this.payrollConfigService.getInsuranceBracketById(id);
    }

    @Patch('insurance-brackets/:id')
    @HttpCode(HttpStatus.OK)
    updateInsurance(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
        return this.payrollConfigService.updateInsuranceBracket(id, dto);
    }

    @Patch('insurance-brackets/:id/approve')
    @Roles(SystemRole.HR_MANAGER)
    @HttpCode(HttpStatus.OK)
    approveInsurance(@Param('id') id: string, @Body() dto: ApproveInsuranceDto) {
        return this.payrollConfigService.approveInsuranceBracket(id, dto);
    }

    @Delete('insurance-brackets/:id')
    @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER)
    @HttpCode(HttpStatus.OK)
    deleteInsurance(@Param('id') id: string) {
        return this.payrollConfigService.deleteInsuranceBracket(id);
    }

    @Patch('insurance-brackets/:id/reject')
    @Roles(SystemRole.HR_MANAGER)
    @HttpCode(HttpStatus.OK)
    rejectInsurance(@Param('id') id: string, @Body() dto: ApproveInsuranceDto) {
        return this.payrollConfigService.rejectInsuranceBracket(id, dto);
    }

  @Get('insurance-brackets/:id/calculate-contributions')
@HttpCode(HttpStatus.OK)
async calculateContributions(
    @Param('id') id: string,
    @Query('salary') salary: string,
) {
    const numericSalary = Number(salary);
    if (isNaN(numericSalary) || numericSalary < 0) {
        throw new BadRequestException('Salary must be a positive number');
    }

    const bracket = await this.payrollConfigService.getInsuranceBracketById(id);
    const result = this.payrollConfigService.calculateContributions(bracket, numericSalary);

    // Always return result even if invalid
    return result;
}


    // ========== DAREEN'S PAYROLL POLICIES ENDPOINTS ==========
    @Post('policies')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createDto: CreatePayrollPolicyDto) {
        const policy = await this.payrollConfigService.create(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Payroll policy created successfully as DRAFT',
            data: policy,
        };
    }

    @Get('policies/all')
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() queryDto: QueryPayrollPolicyDto) {
        const result = await this.payrollConfigService.findAll(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policies retrieved successfully',
            ...result,
        };
    }

    @Get('policies/:id')
    @HttpCode(HttpStatus.OK)
    async findOne(@Param('id') id: string) {
        const policy = await this.payrollConfigService.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy retrieved successfully',
            data: policy,
        };
    }

    @Patch('policies/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdatePayrollPolicyDto,
    ) {
        const policy = await this.payrollConfigService.update(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy updated successfully',
            data: policy,
        };
    }

    @Delete('policies/:id')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string) {
        const result = await this.payrollConfigService.remove(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('policies/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approve(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayrollPolicyDto,
    ) {
        const policy = await this.payrollConfigService.approve(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy approved successfully',
            data: policy,
        };
    }

    @Patch('policies/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async reject(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayrollPolicyDto,
    ) {
        const policy = await this.payrollConfigService.reject(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy rejected successfully',
            data: policy,
        };
    }

    // ========== DAREEN'S PAY TYPES ENDPOINTS ==========
    @Post('pay-types')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createPayType(@Body() createDto: CreatePayTypeDto) {
        const payType = await this.payrollConfigService.createPayType(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Pay type created successfully as DRAFT',
            data: payType,
        };
    }

    @Get('pay-types/all')
    @HttpCode(HttpStatus.OK)
    async findAllPayTypes(@Query() queryDto: QueryPayTypeDto) {
        const result = await this.payrollConfigService.findAllPayTypes(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay types retrieved successfully',
            ...result,
        };
    }

    @Get('pay-types/:id')
    @HttpCode(HttpStatus.OK)
    async findOnePayType(@Param('id') id: string) {
        const payType = await this.payrollConfigService.findOnePayType(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type retrieved successfully',
            data: payType,
        };
    }

    @Patch('pay-types/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updatePayType(
        @Param('id') id: string,
        @Body() updateDto: UpdatePayTypeDto,
    ) {
        const payType = await this.payrollConfigService.updatePayType(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type updated successfully',
            data: payType,
        };
    }

    @Delete('pay-types/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removePayType(@Param('id') id: string) {
        const result = await this.payrollConfigService.removePayType(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('pay-types/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approvePayType(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayTypeDto,
    ) {
        const payType = await this.payrollConfigService.approvePayType(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type approved successfully',
            data: payType,
        };
    }

    @Patch('pay-types/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectPayType(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayTypeDto,
    ) {
        const payType = await this.payrollConfigService.rejectPayType(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type rejected successfully',
            data: payType,
        };
    }

    // ========== DAREEN'S ALLOWANCE ENDPOINTS ==========
    @Post('allowances')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createAllowance(@Body() createDto: CreateAllowanceDto) {
        const allowance = await this.payrollConfigService.createAllowance(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Allowance created successfully as DRAFT',
            data: allowance,
        };
    }

    @Get('allowances/all')
    @HttpCode(HttpStatus.OK)
    async findAllAllowances(@Query() queryDto: QueryAllowanceDto) {
        const result = await this.payrollConfigService.findAllAllowances(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowances retrieved successfully',
            ...result,
        };
    }

    @Get('allowances/:id')
    @HttpCode(HttpStatus.OK)
    async findOneAllowance(@Param('id') id: string) {
        const allowance = await this.payrollConfigService.findOneAllowance(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance retrieved successfully',
            data: allowance,
        };
    }

    @Patch('allowances/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updateAllowance(
        @Param('id') id: string,
        @Body() updateDto: UpdateAllowanceDto,
    ) {
        const allowance = await this.payrollConfigService.updateAllowance(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance updated successfully',
            data: allowance,
        };
    }

    @Delete('allowances/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removeAllowance(@Param('id') id: string) {
        const result = await this.payrollConfigService.removeAllowance(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('allowances/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approveAllowance(
        @Param('id') id: string,
        @Body() approveDto: ApproveAllowanceDto,
    ) {
        const allowance = await this.payrollConfigService.approveAllowance(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance approved successfully',
            data: allowance,
        };
    }

    @Patch('allowances/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectAllowance(
        @Param('id') id: string,
        @Body() approveDto: ApproveAllowanceDto,
    ) {
        const allowance = await this.payrollConfigService.rejectAllowance(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance rejected successfully',
            data: allowance,
        };
    }

    // ========== DAREEN'S SIGNING BONUS ENDPOINTS ==========
    @Post('signing-bonuses')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createSigningBonus(@Body() createDto: CreateSigningBonusDto) {
        const signingBonus = await this.payrollConfigService.createSigningBonus(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Signing bonus created successfully as DRAFT',
            data: signingBonus,
        };
    }

    @Get('signing-bonuses/all')
    @HttpCode(HttpStatus.OK)
    async findAllSigningBonuses(@Query() queryDto: QuerySigningBonusDto) {
        const result = await this.payrollConfigService.findAllSigningBonuses(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonuses retrieved successfully',
            ...result,
        };
    }

    @Get('signing-bonuses/:id')
    @HttpCode(HttpStatus.OK)
    async findOneSigningBonus(@Param('id') id: string) {
        const signingBonus = await this.payrollConfigService.findOneSigningBonus(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus retrieved successfully',
            data: signingBonus,
        };
    }

    @Patch('signing-bonuses/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updateSigningBonus(
        @Param('id') id: string,
        @Body() updateDto: UpdateSigningBonusDto,
    ) {
        const signingBonus = await this.payrollConfigService.updateSigningBonus(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus updated successfully',
            data: signingBonus,
        };
    }

    @Delete('signing-bonuses/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removeSigningBonus(@Param('id') id: string) {
        const result = await this.payrollConfigService.removeSigningBonus(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('signing-bonuses/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approveSigningBonus(
        @Param('id') id: string,
        @Body() approveDto: ApproveSigningBonusDto,
    ) {
        const signingBonus = await this.payrollConfigService.approveSigningBonus(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus approved successfully',
            data: signingBonus,
        };
    }

    @Patch('signing-bonuses/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectSigningBonus(
        @Param('id') id: string,
        @Body() approveDto: ApproveSigningBonusDto,
    ) {
        const signingBonus = await this.payrollConfigService.rejectSigningBonus(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus rejected successfully',
            data: signingBonus,
        };
    }

    // ========== DAREEN'S TERMINATION BENEFITS ENDPOINTS ==========
    @Post('termination-benefits')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createTerminationBenefit(@Body() createDto: CreateTerminationBenefitDto) {
        const benefit = await this.payrollConfigService.createTerminationBenefit(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Termination benefit created successfully as DRAFT',
            data: benefit,
        };
    }

    @Get('termination-benefits/all')
    @HttpCode(HttpStatus.OK)
    async findAllTerminationBenefits(@Query() queryDto: QueryTerminationBenefitDto) {
        const result = await this.payrollConfigService.findAllTerminationBenefits(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefits retrieved successfully',
            ...result,
        };
    }

    @Get('termination-benefits/:id')
    @HttpCode(HttpStatus.OK)
    async findOneTerminationBenefit(@Param('id') id: string) {
        const benefit = await this.payrollConfigService.findOneTerminationBenefit(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit retrieved successfully',
            data: benefit,
        };
    }

    @Patch('termination-benefits/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updateTerminationBenefit(
        @Param('id') id: string,
        @Body() updateDto: UpdateTerminationBenefitDto,
    ) {
        const benefit = await this.payrollConfigService.updateTerminationBenefit(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit updated successfully',
            data: benefit,
        };
    }

    @Delete('termination-benefits/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removeTerminationBenefit(@Param('id') id: string) {
        const result = await this.payrollConfigService.removeTerminationBenefit(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('termination-benefits/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approveTerminationBenefit(
        @Param('id') id: string,
        @Body() approveDto: ApproveTerminationBenefitDto,
    ) {
        const benefit = await this.payrollConfigService.approveTerminationBenefit(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit approved successfully',
            data: benefit,
        };
    }

    @Patch('termination-benefits/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectTerminationBenefit(
        @Param('id') id: string,
        @Body() approveDto: ApproveTerminationBenefitDto,
    ) {
        const benefit = await this.payrollConfigService.rejectTerminationBenefit(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit rejected successfully',
            data: benefit,
        };
    }

    @Post('termination-benefits/calculate')
    @HttpCode(HttpStatus.OK)
    async calculateTerminationEntitlements(
        @Body() employeeData: any,
    ) {
        const result = await this.payrollConfigService.calculateTerminationEntitlements(employeeData);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination entitlements calculated successfully',
            data: result,
        };
    }

    // ========== MANOS' PAY GRADE ENDPOINTS (Keeping only unique) ==========
    @Post('pay-grades')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    createPayGrade(@Body() createDto: CreatePayGradeDto) {
        return this.payrollConfigService.createPayGrade(createDto);
    }

    @Get('pay-grades')
    findAllPayGrades(@Query('status') status?: string) {
        return this.payrollConfigService.findAllPayGrades(status as any);
    }

    @Get('pay-grades/:id')
    async findOnePayGrade(@Param('id') id: string) {
        const payGrade = await this.payrollConfigService.findOnePayGrade(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay grade retrieved successfully',
            data: payGrade,
        };
    }

    @Patch('pay-grades/:id')
    @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
    updatePayGrade(
        @Param('id') id: string,
        @Body() updateDto: UpdatePayGradeDto,
    ) {
        return this.payrollConfigService.updatePayGrade(id, updateDto);
    }

    @Delete('pay-grades/:id')
    @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async deletePayGrade(@Param('id') id: string) {
        const result = await this.payrollConfigService.deletePayGrade(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('pay-grades/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    async approvePayGrade(
        @Param('id') id: string,
        @Body() approveDto: ApproveConfigDto,
    ) {
        const payGrade = await this.payrollConfigService.approvePayGrade(id, approveDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay grade approved successfully',
            data: payGrade,
        };
    }

    @Patch('pay-grades/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    async rejectPayGrade(
        @Param('id') id: string,
        @Body() approveDto: ApproveConfigDto,
    ) {
        const payGrade = await this.payrollConfigService.rejectPayGrade(id, approveDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay grade rejected successfully',
            data: payGrade,
        };
    }

    // ========== MANOS' COMPANY WIDE SETTINGS ENDPOINTS ==========
    @Get('company-settings')
    getCompanyWideSettings() {
        return this.payrollConfigService.getCompanyWideSettings();
    }

    // New endpoint to get only the currency
    @Get('company-currency')
    async getCompanyCurrency() {
        return this.payrollConfigService.getCompanyCurrency();
    }

    @Put('company-settings')
    @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
    updateCompanyWideSettings(@Body() updateDto: UpdateCompanyWideSettingsDto) {
        return this.payrollConfigService.updateCompanyWideSettings(updateDto);
    }

    @Patch('company-settings/approve')
    @Roles(SystemRole.SYSTEM_ADMIN)
    approveCompanyWideSettings() {
        return this.payrollConfigService.approveCompanyWideSettings();
    }

    @Patch('company-settings/reject')
    @Roles(SystemRole.SYSTEM_ADMIN)
    rejectCompanyWideSettings() {
        return this.payrollConfigService.rejectCompanyWideSettings();
    }


}



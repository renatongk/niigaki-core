import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Billing Status
  BillingStatus,
  isBillingStatus,
  isValidTransition,
  hasFullAccess,
  hasLimitedAccess,
  hasAnyAccess,
  // Billing Plan
  BillingCycle,
  isBillingCycle,
  getBillingCycleDays,
  createDefaultSubscriptionMetadata,
  type BillingPlan,
  // ASAAS Events
  AsaasEventType,
  AsaasPaymentStatus,
  AsaasSubscriptionStatus,
  isAsaasEventType,
  isPaymentEvent,
  isSubscriptionEvent,
  requiredAsaasEvents,
  // DTOs
  validateCreateCustomerDto,
  validateCreateSubscriptionDto,
  toInvoice,
  type CreateCustomerDto,
  type CreateSubscriptionDto,
  type AsaasInvoiceResponse,
  // Errors
  BillingErrorCode,
  BillingError,
  SubscriptionCreationError,
  CustomerCreationError,
  PaymentOverdueError,
  WebhookInvalidError,
  BillingStatusInvalidError,
  InvalidBillingTransitionError,
  isBillingError,
  // Services
  BillingEnforcer,
  createBillingEnforcer,
  type TenantBillingData,
} from '../src';

describe('Billing Module', () => {
  describe('BillingStatus', () => {
    describe('isBillingStatus()', () => {
      it('should return true for valid billing statuses', () => {
        expect(isBillingStatus('trial')).toBe(true);
        expect(isBillingStatus('active')).toBe(true);
        expect(isBillingStatus('pending_payment')).toBe(true);
        expect(isBillingStatus('overdue')).toBe(true);
        expect(isBillingStatus('suspended')).toBe(true);
        expect(isBillingStatus('canceled')).toBe(true);
      });

      it('should return false for invalid values', () => {
        expect(isBillingStatus('invalid')).toBe(false);
        expect(isBillingStatus(123)).toBe(false);
        expect(isBillingStatus(null)).toBe(false);
        expect(isBillingStatus(undefined)).toBe(false);
      });
    });

    describe('isValidTransition()', () => {
      it('should allow valid transitions from TRIAL', () => {
        expect(isValidTransition(BillingStatus.TRIAL, BillingStatus.ACTIVE)).toBe(true);
        expect(isValidTransition(BillingStatus.TRIAL, BillingStatus.PENDING_PAYMENT)).toBe(true);
        expect(isValidTransition(BillingStatus.TRIAL, BillingStatus.CANCELED)).toBe(true);
      });

      it('should allow valid transitions from ACTIVE', () => {
        expect(isValidTransition(BillingStatus.ACTIVE, BillingStatus.OVERDUE)).toBe(true);
        expect(isValidTransition(BillingStatus.ACTIVE, BillingStatus.CANCELED)).toBe(true);
      });

      it('should allow valid transitions from OVERDUE', () => {
        expect(isValidTransition(BillingStatus.OVERDUE, BillingStatus.ACTIVE)).toBe(true);
        expect(isValidTransition(BillingStatus.OVERDUE, BillingStatus.SUSPENDED)).toBe(true);
        expect(isValidTransition(BillingStatus.OVERDUE, BillingStatus.CANCELED)).toBe(true);
      });

      it('should disallow invalid transitions', () => {
        expect(isValidTransition(BillingStatus.CANCELED, BillingStatus.ACTIVE)).toBe(false);
        expect(isValidTransition(BillingStatus.TRIAL, BillingStatus.SUSPENDED)).toBe(false);
        expect(isValidTransition(BillingStatus.ACTIVE, BillingStatus.TRIAL)).toBe(false);
      });
    });

    describe('Access helpers', () => {
      it('hasFullAccess should return true for active and trial', () => {
        expect(hasFullAccess(BillingStatus.ACTIVE)).toBe(true);
        expect(hasFullAccess(BillingStatus.TRIAL)).toBe(true);
        expect(hasFullAccess(BillingStatus.OVERDUE)).toBe(false);
        expect(hasFullAccess(BillingStatus.SUSPENDED)).toBe(false);
      });

      it('hasLimitedAccess should return true for overdue and pending', () => {
        expect(hasLimitedAccess(BillingStatus.OVERDUE)).toBe(true);
        expect(hasLimitedAccess(BillingStatus.PENDING_PAYMENT)).toBe(true);
        expect(hasLimitedAccess(BillingStatus.ACTIVE)).toBe(false);
        expect(hasLimitedAccess(BillingStatus.SUSPENDED)).toBe(false);
      });

      it('hasAnyAccess should return true for non-suspended/canceled', () => {
        expect(hasAnyAccess(BillingStatus.ACTIVE)).toBe(true);
        expect(hasAnyAccess(BillingStatus.TRIAL)).toBe(true);
        expect(hasAnyAccess(BillingStatus.OVERDUE)).toBe(true);
        expect(hasAnyAccess(BillingStatus.PENDING_PAYMENT)).toBe(true);
        expect(hasAnyAccess(BillingStatus.SUSPENDED)).toBe(false);
        expect(hasAnyAccess(BillingStatus.CANCELED)).toBe(false);
      });
    });
  });

  describe('BillingPlan', () => {
    describe('isBillingCycle()', () => {
      it('should return true for valid cycles', () => {
        expect(isBillingCycle('MONTHLY')).toBe(true);
        expect(isBillingCycle('YEARLY')).toBe(true);
        expect(isBillingCycle('WEEKLY')).toBe(true);
      });

      it('should return false for invalid values', () => {
        expect(isBillingCycle('daily')).toBe(false);
        expect(isBillingCycle(123)).toBe(false);
      });
    });

    describe('getBillingCycleDays()', () => {
      it('should return correct days for each cycle', () => {
        expect(getBillingCycleDays(BillingCycle.WEEKLY)).toBe(7);
        expect(getBillingCycleDays(BillingCycle.BIWEEKLY)).toBe(14);
        expect(getBillingCycleDays(BillingCycle.MONTHLY)).toBe(30);
        expect(getBillingCycleDays(BillingCycle.QUARTERLY)).toBe(90);
        expect(getBillingCycleDays(BillingCycle.SEMIANNUALLY)).toBe(180);
        expect(getBillingCycleDays(BillingCycle.YEARLY)).toBe(365);
      });
    });

    describe('createDefaultSubscriptionMetadata()', () => {
      it('should create metadata from plan', () => {
        const plan: BillingPlan = {
          id: 'plan-1',
          name: 'Basic Plan',
          description: 'Basic plan description',
          priceInCents: 9990,
          currency: 'BRL',
          cycle: BillingCycle.MONTHLY,
          trialDays: 7,
          features: ['feature1', 'feature2'],
          metadata: {},
          active: true,
        };

        const metadata = createDefaultSubscriptionMetadata(plan);

        expect(metadata.planId).toBe('plan-1');
        expect(metadata.planName).toBe('Basic Plan');
        expect(metadata.priceInCents).toBe(9990);
        expect(metadata.currency).toBe('BRL');
        expect(metadata.cycle).toBe(BillingCycle.MONTHLY);
        expect(metadata.custom).toEqual({});
      });
    });
  });

  describe('ASAAS Events', () => {
    describe('isAsaasEventType()', () => {
      it('should return true for valid event types', () => {
        expect(isAsaasEventType('PAYMENT_CREATED')).toBe(true);
        expect(isAsaasEventType('PAYMENT_CONFIRMED')).toBe(true);
        expect(isAsaasEventType('SUBSCRIPTION_CANCELED')).toBe(true);
      });

      it('should return false for invalid event types', () => {
        expect(isAsaasEventType('INVALID_EVENT')).toBe(false);
        expect(isAsaasEventType(123)).toBe(false);
      });
    });

    describe('isPaymentEvent()', () => {
      it('should identify payment events', () => {
        expect(isPaymentEvent(AsaasEventType.PAYMENT_CREATED)).toBe(true);
        expect(isPaymentEvent(AsaasEventType.PAYMENT_CONFIRMED)).toBe(true);
        expect(isPaymentEvent(AsaasEventType.PAYMENT_OVERDUE)).toBe(true);
        expect(isPaymentEvent(AsaasEventType.SUBSCRIPTION_CANCELED)).toBe(false);
      });
    });

    describe('isSubscriptionEvent()', () => {
      it('should identify subscription events', () => {
        expect(isSubscriptionEvent(AsaasEventType.SUBSCRIPTION_CREATED)).toBe(true);
        expect(isSubscriptionEvent(AsaasEventType.SUBSCRIPTION_CANCELED)).toBe(true);
        expect(isSubscriptionEvent(AsaasEventType.PAYMENT_CREATED)).toBe(false);
      });
    });

    describe('requiredAsaasEvents', () => {
      it('should contain essential events', () => {
        expect(requiredAsaasEvents).toContain(AsaasEventType.PAYMENT_CREATED);
        expect(requiredAsaasEvents).toContain(AsaasEventType.PAYMENT_CONFIRMED);
        expect(requiredAsaasEvents).toContain(AsaasEventType.PAYMENT_OVERDUE);
        expect(requiredAsaasEvents).toContain(AsaasEventType.SUBSCRIPTION_CANCELED);
      });
    });
  });

  describe('Customer DTO', () => {
    describe('validateCreateCustomerDto()', () => {
      it('should return empty array for valid data', () => {
        const dto: CreateCustomerDto = {
          name: 'Test Customer',
          email: 'test@example.com',
          cpfCnpj: '12345678901',
        };

        const errors = validateCreateCustomerDto(dto);
        expect(errors).toEqual([]);
      });

      it('should return errors for missing required fields', () => {
        const dto = {} as CreateCustomerDto;
        const errors = validateCreateCustomerDto(dto);

        expect(errors).toContain('name is required');
        expect(errors).toContain('email is required');
        expect(errors).toContain('cpfCnpj is required');
      });

      it('should validate email format', () => {
        const dto: CreateCustomerDto = {
          name: 'Test',
          email: 'invalid-email',
          cpfCnpj: '12345678901',
        };

        const errors = validateCreateCustomerDto(dto);
        expect(errors).toContain('email is invalid');
      });

      it('should validate CPF/CNPJ format', () => {
        const dto: CreateCustomerDto = {
          name: 'Test',
          email: 'test@example.com',
          cpfCnpj: '123', // Too short
        };

        const errors = validateCreateCustomerDto(dto);
        expect(errors).toContain('cpfCnpj is invalid');
      });

      it('should accept valid CNPJ', () => {
        const dto: CreateCustomerDto = {
          name: 'Test',
          email: 'test@example.com',
          cpfCnpj: '12345678000199', // 14 digits
        };

        const errors = validateCreateCustomerDto(dto);
        expect(errors).not.toContain('cpfCnpj is invalid');
      });
    });
  });

  describe('Subscription DTO', () => {
    describe('validateCreateSubscriptionDto()', () => {
      it('should return empty array for valid data', () => {
        const dto: CreateSubscriptionDto = {
          customer: 'cus_123',
          billingType: 'BOLETO',
          value: 99.90,
          nextDueDate: '2024-01-15',
          cycle: BillingCycle.MONTHLY,
        };

        const errors = validateCreateSubscriptionDto(dto);
        expect(errors).toEqual([]);
      });

      it('should return errors for missing required fields', () => {
        const dto = {} as CreateSubscriptionDto;
        const errors = validateCreateSubscriptionDto(dto);

        expect(errors).toContain('customer is required');
        expect(errors).toContain('billingType is required');
        expect(errors).toContain('value must be a positive number');
        expect(errors).toContain('nextDueDate is required');
        expect(errors).toContain('cycle is required');
      });

      it('should validate value is positive', () => {
        const dto: CreateSubscriptionDto = {
          customer: 'cus_123',
          billingType: 'BOLETO',
          value: -10,
          nextDueDate: '2024-01-15',
          cycle: BillingCycle.MONTHLY,
        };

        const errors = validateCreateSubscriptionDto(dto);
        expect(errors).toContain('value must be a positive number');
      });

      it('should validate date format', () => {
        const dto: CreateSubscriptionDto = {
          customer: 'cus_123',
          billingType: 'BOLETO',
          value: 99.90,
          nextDueDate: '15-01-2024', // Wrong format
          cycle: BillingCycle.MONTHLY,
        };

        const errors = validateCreateSubscriptionDto(dto);
        expect(errors).toContain('nextDueDate must be in YYYY-MM-DD format');
      });
    });
  });

  describe('Invoice DTO', () => {
    describe('toInvoice()', () => {
      it('should convert ASAAS response to internal Invoice', () => {
        const asaasResponse: AsaasInvoiceResponse = {
          id: 'pay_123',
          customer: 'cus_123',
          subscription: 'sub_123',
          billingType: 'BOLETO',
          value: 99.90,
          netValue: 97.90,
          status: AsaasPaymentStatus.PENDING,
          dueDate: '2024-01-15',
          dateCreated: '2024-01-01',
          deleted: false,
          anticipated: false,
          anticipable: true,
          invoiceUrl: 'https://example.com/invoice',
        };

        const invoice = toInvoice(asaasResponse, 'tenant-123');

        expect(invoice.id).toBe('pay_123');
        expect(invoice.tenantId).toBe('tenant-123');
        expect(invoice.customerId).toBe('cus_123');
        expect(invoice.subscriptionId).toBe('sub_123');
        expect(invoice.amountInCents).toBe(9990);
        expect(invoice.netAmountInCents).toBe(9790);
        expect(invoice.currency).toBe('BRL');
        expect(invoice.status).toBe(AsaasPaymentStatus.PENDING);
        expect(invoice.invoiceUrl).toBe('https://example.com/invoice');
      });

      it('should use custom currency', () => {
        const asaasResponse: AsaasInvoiceResponse = {
          id: 'pay_123',
          customer: 'cus_123',
          billingType: 'BOLETO',
          value: 99.90,
          netValue: 97.90,
          status: AsaasPaymentStatus.PENDING,
          dueDate: '2024-01-15',
          dateCreated: '2024-01-01',
          deleted: false,
          anticipated: false,
          anticipable: true,
        };

        const invoice = toInvoice(asaasResponse, 'tenant-123', 'USD');
        expect(invoice.currency).toBe('USD');
      });
    });
  });

  describe('Billing Errors', () => {
    describe('BillingError', () => {
      it('should create error with correct properties', () => {
        const error = new BillingError(
          BillingErrorCode.BILLING_ERROR,
          'Test error message',
          { correlationId: 'corr-123' }
        );

        expect(error.name).toBe('BillingError');
        expect(error.message).toBe('Test error message');
        expect(error.billingErrorCode).toBe(BillingErrorCode.BILLING_ERROR);
        expect(error.correlationId).toBe('corr-123');
      });
    });

    describe('SubscriptionCreationError', () => {
      it('should include tenant and customer IDs', () => {
        const error = new SubscriptionCreationError(
          'tenant-123',
          'cus_123',
          'Failed to create subscription'
        );

        expect(error.name).toBe('SubscriptionCreationError');
        expect(error.tenantId).toBe('tenant-123');
        expect(error.customerId).toBe('cus_123');
        expect(error.billingErrorCode).toBe(BillingErrorCode.SUBSCRIPTION_CREATION_ERROR);
      });
    });

    describe('CustomerCreationError', () => {
      it('should include tenant ID', () => {
        const error = new CustomerCreationError('tenant-123');

        expect(error.name).toBe('CustomerCreationError');
        expect(error.tenantId).toBe('tenant-123');
        expect(error.billingErrorCode).toBe(BillingErrorCode.CUSTOMER_CREATION_ERROR);
      });
    });

    describe('PaymentOverdueError', () => {
      it('should include days overdue', () => {
        const error = new PaymentOverdueError('tenant-123', 5);

        expect(error.name).toBe('PaymentOverdueError');
        expect(error.tenantId).toBe('tenant-123');
        expect(error.daysOverdue).toBe(5);
        expect(error.message).toBe('Payment overdue by 5 days');
      });

      it('should use custom message', () => {
        const error = new PaymentOverdueError('tenant-123', 5, 'Custom message');
        expect(error.message).toBe('Custom message');
      });
    });

    describe('WebhookInvalidError', () => {
      it('should include event type', () => {
        const error = new WebhookInvalidError('Invalid payload', 'UNKNOWN_EVENT');

        expect(error.name).toBe('WebhookInvalidError');
        expect(error.eventType).toBe('UNKNOWN_EVENT');
      });
    });

    describe('BillingStatusInvalidError', () => {
      it('should include status information', () => {
        const error = new BillingStatusInvalidError(
          BillingStatus.SUSPENDED,
          'Tenant is suspended',
          [BillingStatus.ACTIVE]
        );

        expect(error.name).toBe('BillingStatusInvalidError');
        expect(error.currentStatus).toBe(BillingStatus.SUSPENDED);
        expect(error.requiredStatus).toContain(BillingStatus.ACTIVE);
      });
    });

    describe('InvalidBillingTransitionError', () => {
      it('should include from and to statuses', () => {
        const error = new InvalidBillingTransitionError(
          BillingStatus.CANCELED,
          BillingStatus.ACTIVE
        );

        expect(error.name).toBe('InvalidBillingTransitionError');
        expect(error.fromStatus).toBe(BillingStatus.CANCELED);
        expect(error.toStatus).toBe(BillingStatus.ACTIVE);
        expect(error.message).toContain('canceled');
        expect(error.message).toContain('active');
      });
    });

    describe('isBillingError()', () => {
      it('should return true for billing errors', () => {
        expect(isBillingError(new BillingError(BillingErrorCode.BILLING_ERROR, 'test'))).toBe(true);
        expect(isBillingError(new SubscriptionCreationError('t', 'c'))).toBe(true);
        expect(isBillingError(new CustomerCreationError('t'))).toBe(true);
      });

      it('should return false for non-billing errors', () => {
        expect(isBillingError(new Error('test'))).toBe(false);
        expect(isBillingError('string')).toBe(false);
        expect(isBillingError(null)).toBe(false);
      });
    });
  });

  describe('BillingEnforcer', () => {
    const createMockTenantBilling = (
      overrides?: Partial<TenantBillingData>
    ): TenantBillingData => ({
      id: 'tenant-1',
      billingStatus: BillingStatus.ACTIVE,
      ...overrides,
    });

    describe('getBillingContext()', () => {
      it('should return billing context for tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(createMockTenantBilling());
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const context = await enforcer.getBillingContext('tenant-1');

        expect(context).not.toBeNull();
        expect(context?.billingStatus).toBe(BillingStatus.ACTIVE);
        expect(context?.subscriptionActive).toBe(true);
        expect(context?.inTrial).toBe(false);
        expect(context?.isOverdue).toBe(false);
        expect(context?.isSuspended).toBe(false);
      });

      it('should return null for unknown tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(null);
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const context = await enforcer.getBillingContext('unknown');
        expect(context).toBeNull();
      });

      it('should indicate trial status', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.TRIAL })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const context = await enforcer.getBillingContext('tenant-1');
        expect(context?.inTrial).toBe(true);
        expect(context?.subscriptionActive).toBe(true);
      });

      it('should indicate overdue status', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({
            billingStatus: BillingStatus.OVERDUE,
            subscriptionMetadata: {
              planId: 'plan-1',
              planName: 'Test',
              priceInCents: 1000,
              currency: 'BRL',
              cycle: BillingCycle.MONTHLY,
              daysOverdue: 5,
              custom: {},
            },
          })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const context = await enforcer.getBillingContext('tenant-1');
        expect(context?.isOverdue).toBe(true);
        expect(context?.daysOverdue).toBe(5);
        expect(context?.subscriptionActive).toBe(false);
      });

      it('should indicate suspended status', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.SUSPENDED })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const context = await enforcer.getBillingContext('tenant-1');
        expect(context?.isSuspended).toBe(true);
      });
    });

    describe('requireActive()', () => {
      it('should return true for active tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(createMockTenantBilling());
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: false });

        const result = await enforcer.requireActive('tenant-1');
        expect(result).toBe(true);
      });

      it('should return true for trial tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.TRIAL })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: false });

        const result = await enforcer.requireActive('tenant-1');
        expect(result).toBe(true);
      });

      it('should return false for suspended tenant (no throw)', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.SUSPENDED })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: false });

        const result = await enforcer.requireActive('tenant-1');
        expect(result).toBe(false);
      });

      it('should throw for suspended tenant (throw mode)', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.SUSPENDED })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: true });

        await expect(enforcer.requireActive('tenant-1')).rejects.toThrow(BillingStatusInvalidError);
      });
    });

    describe('inTrial()', () => {
      it('should return true when tenant is in trial', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.TRIAL })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.inTrial('tenant-1');
        expect(result).toBe(true);
      });

      it('should return false when tenant is active', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(createMockTenantBilling());
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.inTrial('tenant-1');
        expect(result).toBe(false);
      });
    });

    describe('requireAnyAccess()', () => {
      it('should return true for active tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(createMockTenantBilling());
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: false });

        const result = await enforcer.requireAnyAccess('tenant-1');
        expect(result).toBe(true);
      });

      it('should return true for overdue tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.OVERDUE })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: false });

        const result = await enforcer.requireAnyAccess('tenant-1');
        expect(result).toBe(true);
      });

      it('should return false for suspended tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.SUSPENDED })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: false });

        const result = await enforcer.requireAnyAccess('tenant-1');
        expect(result).toBe(false);
      });

      it('should return false for canceled tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.CANCELED })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling, throwOnDenial: false });

        const result = await enforcer.requireAnyAccess('tenant-1');
        expect(result).toBe(false);
      });
    });

    describe('hasLimitedAccessOnly()', () => {
      it('should return true for overdue tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.OVERDUE })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.hasLimitedAccessOnly('tenant-1');
        expect(result).toBe(true);
      });

      it('should return true for pending_payment tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.PENDING_PAYMENT })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.hasLimitedAccessOnly('tenant-1');
        expect(result).toBe(true);
      });

      it('should return false for active tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(createMockTenantBilling());
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.hasLimitedAccessOnly('tenant-1');
        expect(result).toBe(false);
      });
    });

    describe('isSuspendedOrCanceled()', () => {
      it('should return true for suspended tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.SUSPENDED })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.isSuspendedOrCanceled('tenant-1');
        expect(result).toBe(true);
      });

      it('should return true for canceled tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(
          createMockTenantBilling({ billingStatus: BillingStatus.CANCELED })
        );
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.isSuspendedOrCanceled('tenant-1');
        expect(result).toBe(true);
      });

      it('should return false for active tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(createMockTenantBilling());
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.isSuspendedOrCanceled('tenant-1');
        expect(result).toBe(false);
      });

      it('should return true when tenant not found', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(null);
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const result = await enforcer.isSuspendedOrCanceled('unknown');
        expect(result).toBe(true);
      });
    });

    describe('getBillingStatus()', () => {
      it('should return billing status', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(createMockTenantBilling());
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const status = await enforcer.getBillingStatus('tenant-1');
        expect(status).toBe(BillingStatus.ACTIVE);
      });

      it('should return null for unknown tenant', async () => {
        const getTenantBilling = vi.fn().mockResolvedValue(null);
        const enforcer = createBillingEnforcer({ getTenantBilling });

        const status = await enforcer.getBillingStatus('unknown');
        expect(status).toBeNull();
      });
    });

    describe('Static ABAC Policy Functions', () => {
      it('createActiveBillingPolicy should check for active status', async () => {
        const getTenantBilling = vi.fn()
          .mockResolvedValueOnce(createMockTenantBilling())
          .mockResolvedValueOnce(createMockTenantBilling({ billingStatus: BillingStatus.SUSPENDED }));

        const policy = BillingEnforcer.createActiveBillingPolicy(getTenantBilling);

        expect(await policy({ tenant_id: 'tenant-1' })).toBe(true);
        expect(await policy({ tenant_id: 'tenant-2' })).toBe(false);
        expect(await policy({})).toBe(false);
      });

      it('createAnyAccessBillingPolicy should check for any access', async () => {
        const getTenantBilling = vi.fn()
          .mockResolvedValueOnce(createMockTenantBilling({ billingStatus: BillingStatus.OVERDUE }))
          .mockResolvedValueOnce(createMockTenantBilling({ billingStatus: BillingStatus.SUSPENDED }));

        const policy = BillingEnforcer.createAnyAccessBillingPolicy(getTenantBilling);

        expect(await policy({ tenant_id: 'tenant-1' })).toBe(true);
        expect(await policy({ tenant_id: 'tenant-2' })).toBe(false);
      });

      it('createTrialBillingPolicy should check for trial status', async () => {
        const getTenantBilling = vi.fn()
          .mockResolvedValueOnce(createMockTenantBilling({ billingStatus: BillingStatus.TRIAL }))
          .mockResolvedValueOnce(createMockTenantBilling());

        const policy = BillingEnforcer.createTrialBillingPolicy(getTenantBilling);

        expect(await policy({ tenant_id: 'tenant-1' })).toBe(true);
        expect(await policy({ tenant_id: 'tenant-2' })).toBe(false);
      });
    });
  });
});

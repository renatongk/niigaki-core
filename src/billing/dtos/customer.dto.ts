/**
 * Customer DTOs
 * Data Transfer Objects for ASAAS customer operations.
 */

/**
 * Input for creating a new ASAAS customer.
 */
export interface CreateCustomerDto {
  /** Customer name */
  name: string;
  /** Customer email */
  email: string;
  /** CPF or CNPJ (Brazilian tax ID) */
  cpfCnpj: string;
  /** Phone number with country code */
  phone?: string;
  /** Mobile phone number with country code */
  mobilePhone?: string;
  /** Customer postal code */
  postalCode?: string;
  /** Customer address */
  address?: string;
  /** Address number */
  addressNumber?: string;
  /** Address complement */
  complement?: string;
  /** Province/State */
  province?: string;
  /** City */
  city?: string;
  /** External reference (e.g., tenant ID) */
  externalReference?: string;
  /** Whether to disable email notifications */
  notificationDisabled?: boolean;
  /** Additional observations */
  observations?: string;
  /** Customer group name */
  groupName?: string;
  /** Company name (for legal entities) */
  company?: string;
}

/**
 * Input for updating an existing ASAAS customer.
 */
export interface UpdateCustomerDto {
  /** Customer name */
  name?: string;
  /** Customer email */
  email?: string;
  /** CPF or CNPJ (Brazilian tax ID) */
  cpfCnpj?: string;
  /** Phone number with country code */
  phone?: string;
  /** Mobile phone number with country code */
  mobilePhone?: string;
  /** Customer postal code */
  postalCode?: string;
  /** Customer address */
  address?: string;
  /** Address number */
  addressNumber?: string;
  /** Address complement */
  complement?: string;
  /** Province/State */
  province?: string;
  /** City */
  city?: string;
  /** External reference (e.g., tenant ID) */
  externalReference?: string;
  /** Whether to disable email notifications */
  notificationDisabled?: boolean;
  /** Additional observations */
  observations?: string;
  /** Customer group name */
  groupName?: string;
  /** Company name (for legal entities) */
  company?: string;
}

/**
 * ASAAS customer response structure.
 */
export interface AsaasCustomerResponse {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  externalReference?: string;
  notificationDisabled: boolean;
  observations?: string;
  dateCreated: string;
  deleted: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  cannotBeDeletedReason?: string;
  cannotEditReason?: string;
}

/**
 * Validate CreateCustomerDto fields.
 * @param dto - The DTO to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateCreateCustomerDto(dto: CreateCustomerDto): string[] {
  const errors: string[] = [];

  if (!dto.name || dto.name.trim().length === 0) {
    errors.push('name is required');
  }

  if (!dto.email || dto.email.trim().length === 0) {
    errors.push('email is required');
  } else if (!isValidEmail(dto.email)) {
    errors.push('email is invalid');
  }

  if (!dto.cpfCnpj || dto.cpfCnpj.trim().length === 0) {
    errors.push('cpfCnpj is required');
  } else if (!isValidCpfCnpj(dto.cpfCnpj)) {
    errors.push('cpfCnpj is invalid');
  }

  return errors;
}

/**
 * Simple email validation.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Simple CPF/CNPJ validation (format only).
 */
function isValidCpfCnpj(value: string): boolean {
  // Remove non-digits
  const digits = value.replace(/\D/g, '');
  // CPF has 11 digits, CNPJ has 14 digits
  return digits.length === 11 || digits.length === 14;
}

/**
 * Customer DTO module export
 */
export const customerDto = {
  validateCreateCustomerDto,
};

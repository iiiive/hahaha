export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  roleId: number;

  completeAddress?: string;
  phoneNumber?: string;

  isApproved?: boolean;
  status?: string;
}

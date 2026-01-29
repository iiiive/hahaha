import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../core/services/user.service';
import { CreateUserDto } from '../../shared/models/create-user.dto';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
})
export class CreateUserComponent {
  form: FormGroup;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(80)]],
      lastName: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(64)]],
      roleId: [2, [Validators.required]], // default role id = 2 (change if needed)
      completeAddress: [''],
      phoneNumber: [''],
      isApproved: [false],
      status: ['Pending'],
    });
  }

  // ✅ so template can use f['email'], f['password'], etc.
  get f() {
    return this.form.controls;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  submit() {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error('Please fix the errors in the form.');
      return;
    }

    this.loading = true;

    // ✅ map to DB-friendly payload
    const payload: CreateUserDto = {
      fullName: `${this.f['firstName'].value}`.trim() + ' ' + `${this.f['lastName'].value}`.trim(),
      email: `${this.f['email'].value}`.trim(),
      password: this.f['password'].value,
      roleId: Number(this.f['roleId'].value),
      completeAddress: `${this.f['completeAddress'].value || ''}`.trim(),
      phoneNumber: `${this.f['phoneNumber'].value || ''}`.trim(),
      isApproved: !!this.f['isApproved'].value,
      status: `${this.f['status'].value || 'Pending'}`.trim(),
    };

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.toastr.success('User created successfully!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error ||
          'Failed to create user. Check API endpoint and try again.';
        this.toastr.error(msg);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}

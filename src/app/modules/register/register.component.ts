import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../core/services/api.service';

// ✅ password + confirmPassword must match
const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.maxLength(120)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
        password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
        confirmPassword: ['', [Validators.required]],
        // ✅ keep roleId in UI if you want, but DO NOT send to backend unless backend supports it
        roleId: [2],
      },
      { validators: passwordMatchValidator }
    );
  }


  goBack() {
  this.router.navigate(['/login']);
}

  get f() {
    return this.form.controls;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  submit() {
    if (this.loading) return;

    // ✅ stop if invalid/mismatch
    if (this.form.invalid || this.form.hasError('passwordMismatch')) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      fullName: String(this.f['fullName'].value || '').trim(),
      // ✅ normalize email to avoid duplicates like A@B.com vs a@b.com
      email: String(this.f['email'].value || '').trim().toLowerCase(),
      password: String(this.f['password'].value || ''),
    };

    this.loading = true;

    // ✅ should become https://localhost:7006/api/Auth/register (depends on ApiService base URL)
    this.api
      .post<any>('Auth/register', payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.toastr.success(res?.message || 'Account created! Waiting for approval.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          // ✅ better error handling
          const status = err?.status;

          if (status === 409) {
            // backend says conflict (email exists)
            this.toastr.error('Email already exists. If your previous account was declined, ask admin to reset it or we need backend to allow re-register.');
            return;
          }

          if (status === 400) {
            this.toastr.error(err?.error?.message || 'Invalid registration input.');
            return;
          }

          if (status === 403) {
            this.toastr.error(err?.error?.message || 'Registration not allowed.');
            return;
          }

          this.toastr.error(err?.error?.message || 'Failed to register.');
        },
      });
  }
}

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
        roleId: [2], // 2=User (default), 1=Admin
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

    if (this.form.invalid || this.form.hasError('passwordMismatch')) {
      this.form.markAllAsTouched();
      return;
    }

    // ✅ IMPORTANT FIX: include roleId in payload
    const roleIdRaw = this.f['roleId'].value;
    const roleId = Number(roleIdRaw);

    const payload = {
      fullName: String(this.f['fullName'].value || '').trim(),
      email: String(this.f['email'].value || '').trim().toLowerCase(),
      password: String(this.f['password'].value || ''),
      roleId: roleId === 1 ? 1 : 2, // ✅ only allow 1 or 2 from UI
    };

    this.loading = true;

    this.api
      .post<any>('Auth/register', payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.toastr.success(res?.message || 'Account created! Waiting for approval.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          const status = err?.status;

          if (status === 409) {
            this.toastr.error(
              'Email already exists. If your previous account was declined, ask admin to reset it or allow re-register.'
            );
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

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <main class="max-w-xl mx-auto px-4 py-8">
    <div class="bg-white rounded-xl shadow p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-1">Change Password</h2>
      <p class="text-sm text-gray-500 mb-6">Make sure your new password is strong.</p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input type="password" formControlName="currentPassword"
                 class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input type="password" formControlName="newPassword"
                 class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input type="password" formControlName="confirmPassword"
                 class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
          <div *ngIf="form.touched && passwordMismatch()" class="text-xs text-red-600 mt-1">
            Password confirmation does not match.
          </div>
        </div>

        <button type="submit"
                class="w-full px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
                [disabled]="loading || form.invalid || passwordMismatch()">
          {{ loading ? 'Updating...' : 'Update Password' }}
        </button>

        <div *ngIf="message" class="text-sm mt-2"
             [ngClass]="messageType==='ok' ? 'text-green-700' : 'text-red-600'">
          {{ message }}
        </div>
      </form>
    </div>
  </main>
  `
})
export class ChangePasswordComponent {
  form: FormGroup;
  loading = false;
  message = '';
  messageType: 'ok' | 'err' = 'ok';

  constructor(private fb: FormBuilder, private api: ApiService) {
    this.form = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  passwordMismatch(): boolean {
    return (this.form.value.newPassword || '') !== (this.form.value.confirmPassword || '');
  }

  submit(): void {
    if (this.loading) return;
    if (this.form.invalid || this.passwordMismatch()) return;

    this.message = '';
    this.loading = true;

    const payload = {
      currentPassword: String(this.form.value.currentPassword || ''),
      newPassword: String(this.form.value.newPassword || ''),
    };

    // ✅ backend route is /api/user-settings/password
    this.api.put<any>('user-settings/password', payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.messageType = 'ok';
          this.message = res?.message || 'Password updated successfully.';
          this.form.reset();
        },
        error: (err) => {
          this.messageType = 'err';
          this.message = err?.error?.message || 'Failed to update password.';
        }
      });
  }
}

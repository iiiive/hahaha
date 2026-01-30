import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  showModal = true; // controls modal visibility
  loginForm: FormGroup;
  loginMessage: string = '';
  loading: boolean = false;

  @Output() loggedIn = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    public authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  closeModal() {
    this.showModal = false;
  }

  // ✅ navigate to Register page
  goToRegister() {
    this.loginMessage = '';
    this.showModal = false;

    // let Angular render/hide the modal first, then navigate
    Promise.resolve().then(() => {
      this.router.navigate(['/register']);
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginMessage = 'Please fill in all required fields.';
      return;
    }

    const { email, password } = this.loginForm.value;

    this.loading = true;
    this.loginMessage = '';

    this.authService.login({ email, password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.loggedIn.emit(); // notify parent header
          this.loginMessage = 'Login successful!';
          this.showModal = false;

          // ✅ Role-based redirect:
          // Admin + SuperAdmin -> /dashboard
          // User -> /user-dashboard
          const role = this.authService.getNormalizedRole();

          setTimeout(() => {
            if (role === 'Admin' || role === 'SuperAdmin') {
              this.router.navigateByUrl('/dashboard');
            } else {
              this.router.navigateByUrl('/user-dashboard');
            }
          }, 0);
        },
        error: (err) => {
          let msg = 'Server error. Please try again later.';

          // 401 = wrong credentials
          if (err?.status === 401) {
            msg = err?.error?.message || 'Wrong email or password.';
          }
          // 403 = declined / forbidden
          else if (err?.status === 403) {
            msg = err?.error?.message || 'Your account is not approved yet.';
          }
          // 0 = cannot connect (API down / CORS / network)
          else if (err?.status === 0) {
            msg = 'Cannot connect to server. Please make sure the API is running.';
          }
          // 500+ = server error
          else if (err?.status >= 500) {
            msg = err?.error?.message || 'Server error. Please try again later.';
          }

          this.loginMessage = msg;
        }
      });
  }
}

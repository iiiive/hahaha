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

  constructor(private fb: FormBuilder, private router: Router, public authService: AuthService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  closeModal() {
    this.showModal = false;
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
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.loggedIn.emit(); // notify parent header
          this.loginMessage = 'Login successful!';
          this.showModal = false;
          // Navigate after status is updated
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 0);
        },
        error: () => {
          this.loginMessage = 'Invalid credentials or server error';
        }
      });
  }
}

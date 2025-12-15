import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  // constructor(private auth: AuthService, private router: Router) { }

  // canActivate(): boolean {
  //   if (this.auth.isAuthenticated()) return true;
  //   this.router.navigate(['/login']);
  //   return false;
  // }
  constructor(private router: Router) { }

  canActivate(): boolean {
    const isLoggedIn = !!localStorage.getItem('token'); // simple check
    if (!isLoggedIn) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}

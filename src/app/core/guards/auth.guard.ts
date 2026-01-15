import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // ✅ Use method that exists in your AuthService
    if (auth.isAuthenticated()) return true;

    router.navigate(['/login']);
    return false;
};
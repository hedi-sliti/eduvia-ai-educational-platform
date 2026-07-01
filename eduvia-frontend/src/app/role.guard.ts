import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const user = this.authService.currentUserValue;
    const allowedRoles = route.data['roles'] as Array<string>;

    if (user && allowedRoles.includes(user.role)) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}

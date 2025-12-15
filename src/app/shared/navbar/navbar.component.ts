import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAdmin: boolean = false;
  private sub?: Subscription;

  constructor(private authService: AuthService) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.sub = this.authService.isAdmin$.subscribe(status => {
      this.isAdmin = status;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

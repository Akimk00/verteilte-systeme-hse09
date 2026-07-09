import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-start',
  standalone: true,
  templateUrl: './start.component.html',
  styleUrl: './start.component.css'
})
export class StartComponent {

  constructor(private router: Router) {}

  startGame(): void {
    this.router.navigate(['/game']);
  }
}

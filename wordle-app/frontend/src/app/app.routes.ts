import { Routes } from '@angular/router';
import { StartComponent } from './start/start.component';
import { GameComponent } from './game/game.component';

export const routes: Routes = [
  { path: '', component: StartComponent },
  { path: 'game', component: GameComponent },
  { path: '**', redirectTo: '' }
];

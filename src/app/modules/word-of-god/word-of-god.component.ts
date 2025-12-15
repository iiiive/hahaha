import { Component } from '@angular/core';
import { HomiliesComponent } from './homilies/homilies.component';
import { GospelComponent } from './gospel/gospel.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-word-of-god',
  standalone: true,
  imports: [CommonModule, GospelComponent, HomiliesComponent],
  templateUrl: './word-of-god.component.html',
  styleUrl: './word-of-god.component.scss'
})
export class WordOfGodComponent {
  activeTab: 'homilies' | 'gospel' = 'homilies';
}

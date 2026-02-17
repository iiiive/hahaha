import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';

@Component({
  selector: 'app-banner-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-carousel.component.html',
  styleUrls: ['./banner-carousel.component.scss']
})
export class BannerCarouselComponent implements OnChanges {
  @Input() images: string[] = [];
  @Input() canUpload = false;
  @Input() uploading = false;

  @Output() uploadConfirmed = new EventEmitter<File>();

  index = 0;

  // review modal state
  reviewOpen = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      const len = this.images?.length ?? 0;
      if (!len) {
        this.index = 0;
      } else if (this.index > len - 1) {
        this.index = 0;
      }
    }
  }

  get hasImages(): boolean {
    return Array.isArray(this.images) && this.images.length > 0;
  }

  prev(): void {
    if (!this.hasImages) return;
    const len = this.images.length;
    this.index = (this.index - 1 + len) % len;
  }

  next(): void {
    if (!this.hasImages) return;
    const len = this.images.length;
    this.index = (this.index + 1) % len;
  }

  go(i: number): void {
    if (!this.hasImages) return;
    if (i < 0 || i >= this.images.length) return;
    this.index = i;
  }

  // ========= Upload flow (Choose → Review → Upload)
  openFilePicker(input: HTMLInputElement): void {
    if (!this.canUpload || this.uploading) return;
    input.click();
  }

  onFileSelected(ev: Event): void {
    if (!this.canUpload || this.uploading) return;

    const input = ev.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;

    // allow reselecting same file later
    if (input) input.value = '';

    if (!file) return;

    // lightweight guard (safe)
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
    this.reviewOpen = true;
  }

  closeReview(): void {
    this.reviewOpen = false;

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewUrl = null;
    this.selectedFile = null;
  }

  confirmUpload(): void {
    if (!this.selectedFile) return;

    // emit to parent (Dashboard/AdminUsers)
    this.uploadConfirmed.emit(this.selectedFile);

    // close modal (parent handles uploading spinner state via [uploading])
    this.closeReview();
  }
}

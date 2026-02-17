import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

type ProfileDto = {
  userId?: number;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  completeAddress?: string;
  profilePhotoUrl?: string;
};

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <main class="max-w-3xl mx-auto px-4 py-8">
    <div class="bg-white rounded-xl shadow p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-1">Profile Settings</h2>
      <p class="text-sm text-gray-500 mb-6">Update your basic information and profile photo.</p>

      <div class="flex flex-col md:flex-row gap-6 mb-6">
        <div class="w-full md:w-56">
          <div class="rounded-xl border bg-gray-50 p-4 flex flex-col items-center">
            <div class="w-28 h-28 rounded-full overflow-hidden bg-white border flex items-center justify-center">
              <img *ngIf="photoPreview || profilePhotoUrl"
                   [src]="photoPreview || profilePhotoUrl"
                   class="w-full h-full object-cover" />
              <span *ngIf="!(photoPreview || profilePhotoUrl)" class="text-3xl">👤</span>
            </div>

            <label class="mt-4 w-full">
              <input type="file" class="hidden" accept="image/*" (change)="onFileChange($event)" />
              <div class="w-full text-center cursor-pointer text-sm px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
                Upload / Change Photo
              </div>
            </label>

            <button
              type="button"
              class="mt-3 w-full text-sm px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
              (click)="uploadPhoto()"
              [disabled]="!selectedFile || uploadingPhoto">
              {{ uploadingPhoto ? 'Uploading...' : 'Save Photo' }}
            </button>

            <p class="mt-3 text-xs text-gray-500 text-center">JPG/PNG recommended</p>
          </div>
        </div>

        <div class="flex-1">
          <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input formControlName="fullName"
                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your name" />
              <div *ngIf="form.get('fullName')?.touched && form.get('fullName')?.invalid" class="text-xs text-red-600 mt-1">
                Name is required.
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input formControlName="email"
                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your email" />
              <div *ngIf="form.get('email')?.touched && form.get('email')?.invalid" class="text-xs text-red-600 mt-1">
                Valid email is required.
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input formControlName="phoneNumber"
                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="09xxxxxxxxx" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Complete Address</label>
              <input formControlName="completeAddress"
                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your address" />
            </div>

            <div class="pt-2 flex gap-2">
              <button type="submit"
                class="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
                [disabled]="form.invalid || saving || !hasChanges()">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>

              <button type="button"
                class="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
                (click)="loadProfile()"
                [disabled]="saving">
                Refresh
              </button>
            </div>

            <div *ngIf="message" class="text-sm mt-2"
                 [ngClass]="messageType==='ok' ? 'text-green-700' : 'text-red-600'">
              {{ message }}
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>
  `
})
export class ProfileSettingsComponent implements OnInit {
  form!: FormGroup;

  saving = false;
  message = '';
  messageType: 'ok' | 'err' = 'ok';

  profilePhotoUrl: string | null = null;
  photoPreview: string | null = null;
  selectedFile: File | null = null;
  uploadingPhoto = false;

  private apiBase = environment.apiUrl;

  private original: Required<Pick<ProfileDto, 'fullName' | 'email' | 'phoneNumber' | 'completeAddress'>> = {
    fullName: '',
    email: '',
    phoneNumber: '',
    completeAddress: ''
  };

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      completeAddress: ['']
    });

    this.loadProfile();
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ✅ detects changes correctly (enables Save only if different)
  hasChanges(): boolean {
    const v = this.form.value;
    return (
      String(v.fullName || '') !== String(this.original.fullName || '') ||
      String(v.email || '') !== String(this.original.email || '') ||
      String(v.phoneNumber || '') !== String(this.original.phoneNumber || '') ||
      String(v.completeAddress || '') !== String(this.original.completeAddress || '')
    );
  }

  loadProfile(): void {
    this.message = '';

    this.http.get<any>(`${this.apiBase}/user-settings/profile`, { headers: this.authHeaders() })
      .subscribe({
        next: (p) => {
          // ✅ support BOTH camelCase + PascalCase from backend
          const fullName = (p?.fullName ?? p?.FullName ?? '').toString();
          const email = (p?.email ?? p?.Email ?? '').toString();
          const phoneNumber = (p?.phoneNumber ?? p?.PhoneNumber ?? '').toString();
          const completeAddress = (p?.completeAddress ?? p?.CompleteAddress ?? '').toString();
          const profilePhotoUrl = (p?.profilePhotoUrl ?? p?.ProfilePhotoUrl ?? null) as string | null;

          this.original = { fullName, email, phoneNumber, completeAddress };

          this.form.patchValue({
            fullName,
            email,
            phoneNumber,
            completeAddress
          }, { emitEvent: false });

          this.profilePhotoUrl = profilePhotoUrl;

          // ✅ reset dirty state after load so Save is disabled
          this.form.markAsPristine();
          this.form.markAsUntouched();
        },
        error: (err) => {
          this.messageType = 'err';
          this.message = err?.error?.message || 'Failed to load profile. Check /api/user-settings/profile.';
        }
      });
  }

  save(): void {
    if (this.form.invalid || !this.hasChanges()) return;

    this.message = '';
    this.saving = true;

    const payload = {
      fullName: String(this.form.value.fullName || '').trim(),
      email: String(this.form.value.email || '').trim(),
      phoneNumber: String(this.form.value.phoneNumber || '').trim(),
      completeAddress: String(this.form.value.completeAddress || '').trim(),
    };

    this.http.put<any>(`${this.apiBase}/user-settings/profile`, payload, { headers: this.authHeaders() })
      .subscribe({
        next: () => {
          this.messageType = 'ok';
          this.message = 'Profile updated successfully.';
          this.saving = false;

          // ✅ update original so Save disables again
          this.original = { ...payload };
          this.form.markAsPristine();
        },
        error: (err) => {
          this.messageType = 'err';
          this.message = err?.error?.message || 'Save failed. Check /api/user-settings/profile PUT.';
          this.saving = false;
        }
      });
  }

  onFileChange(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedFile = file;

    if (!file) {
      this.photoPreview = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.photoPreview = String(reader.result);
    reader.readAsDataURL(file);
  }

  uploadPhoto(): void {
    if (!this.selectedFile) return;

    this.uploadingPhoto = true;
    this.message = '';

    const fd = new FormData();
    fd.append('file', this.selectedFile);

    // NOTE: Only works if you have this endpoint.
    this.http.post<any>(`${this.apiBase}/user-settings/profile/photo`, fd, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          const url = res?.profilePhotoUrl ?? res?.ProfilePhotoUrl ?? null;
          if (url) this.profilePhotoUrl = url;

          this.messageType = 'ok';
          this.message = 'Photo updated successfully.';
          this.uploadingPhoto = false;
          this.selectedFile = null;
        },
        error: (err) => {
          this.messageType = 'err';
          this.message = err?.error?.message || 'Upload failed. Check /api/user-settings/profile/photo.';
          this.uploadingPhoto = false;
        }
      });
  }
}

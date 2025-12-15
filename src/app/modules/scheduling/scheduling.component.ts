import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiceSchedule } from '../../shared/models/service-schedule';
import { ServiceScheduleService } from '../../core/services/service-schedule.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable } from 'rxjs';
import { ServiceScheduleRequirement } from '../../shared/models/service-schedule-requirement';
import { environment } from '../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss'
})
export class SchedulingComponent implements OnInit {
  schedulingForm!: FormGroup;
  uploadedFiles: { [key: string]: File[] } = {};
  isAdmin: boolean = false;

  // Approved appointments (Upcoming)
  schedules: ServiceSchedule[] = [];

  // Pending appointments (Schedule Requests)
  pendingSchedules: ServiceSchedule[] = [];

  // Filter state for pending schedule requests
  selectedServiceFilter: string = 'all';
  serviceTypeFilters = [
    { key: 'all', label: 'All' },
    { key: 'wedding', label: 'Wedding' },
    { key: 'baptism', label: 'Baptism' },
    { key: 'blessing', label: 'House Blessing' },
    { key: 'funeral', label: 'Funeral Service' }
  ];

  requirements: ServiceScheduleRequirement[] = [];
  editingId: number | null = null;
  environment = environment;

  // REVIEW MODAL STATE
  showReviewModal = false;
  reviewData: any = null;

  constructor(
    private fb: FormBuilder,
    private scheduleService: ServiceScheduleService,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    this.schedulingForm = this.fb.group({
      serviceType: ['', Validators.required],
      partner1FullName: [''],
      partner2FullName: [''],
      clientFirstName: ['', Validators.required],
      clientLastName: ['', Validators.required],
      clientPhone: ['', [Validators.required, Validators.pattern(/^[0-9\-\+]{9,15}$/)]],
      clientEmail: ['', [Validators.required, Validators.email]],
      serviceDate: ['', Validators.required],
      serviceTime: ['', Validators.required],
      specialRequests: [''],
      serviceAddress: ['']
    });

    this.applyDynamicValidation();
    this.loadSchedules();
  }

  /**
   * Dynamically apply validators based on service type
   */
  applyDynamicValidation() {
    this.schedulingForm.get('serviceType')?.valueChanges.subscribe((type) => {
      const partner1 = this.schedulingForm.get('partner1FullName');
      const partner2 = this.schedulingForm.get('partner2FullName');
      const address = this.schedulingForm.get('serviceAddress');

      partner1?.clearValidators();
      partner2?.clearValidators();
      address?.clearValidators();

      if (type === 'wedding') {
        partner1?.setValidators([Validators.required]);
        partner2?.setValidators([Validators.required]);
      }

      if (type === 'blessing' || type === 'funeral') {
        address?.setValidators([Validators.required]);
      }

      partner1?.updateValueAndValidity();
      partner2?.updateValueAndValidity();
      address?.updateValueAndValidity();
    });
  }

  /**
   * Load all schedules from backend and split into pending + approved
   */
  loadSchedules() {
    this.scheduleService.getAll().subscribe((data) => {
      const mapped = data.map((s: any) => this.mapSchedule(s));

      // Case-insensitive split based on status
      this.pendingSchedules = mapped.filter(
        (s: any) => (s.status ?? '').toString().toLowerCase() !== 'approved'
      );
      this.schedules = mapped.filter(
        (s: any) => (s.status ?? '').toString().toLowerCase() === 'approved'
      );
    });
  }

  /**
   * Get color classes based on service type
   */
  getColor(type: string) {
    const colors: any = {
      wedding: {
        colorClass: 'border-l-4 border-pink-500 bg-pink-50',
        badgeClass: 'bg-pink-100 text-pink-800'
      },
      baptism: {
        colorClass: 'border-l-4 border-blue-500 bg-blue-50',
        badgeClass: 'bg-blue-100 text-blue-800'
      },
      blessing: {
        colorClass: 'border-l-4 border-green-500 bg-green-50',
        badgeClass: 'bg-green-100 text-green-800'
      },
      funeral: {
        colorClass: 'border-l-4 border-gray-500 bg-gray-50',
        badgeClass: 'bg-gray-200 text-gray-800'
      }
    };
    return colors[type.toLowerCase()] || { colorClass: '', badgeClass: '' };
  }

  /**
   * Handle file input change
   */
  onFileChange(event: Event, type: string) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (!this.uploadedFiles[type]) this.uploadedFiles[type] = [];
      this.uploadedFiles[type].push(file);
      this.toastr.info(`${type} file staged, will upload on Save/Update`);
    }
  }

  capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }

  // ---------------- FILTER HELPERS ----------------

  get filteredPendingSchedules(): ServiceSchedule[] {
    if (this.selectedServiceFilter === 'all') {
      return this.pendingSchedules;
    }
    return this.pendingSchedules.filter(
      (s) => s.serviceType?.toLowerCase() === this.selectedServiceFilter
    );
  }

  setServiceFilter(key: string) {
    this.selectedServiceFilter = key;
  }

  // ---------------- REVIEW FLOW ----------------

  startReview() {
    if (this.schedulingForm.invalid) {
      this.toastr.warning('Please fill all required fields.');
      this.schedulingForm.markAllAsTouched();
      return;
    }

    this.reviewData = this.schedulingForm.value;
    this.showReviewModal = true;
  }

  backToEdit() {
    this.showReviewModal = false;
  }

  confirmAndSubmit() {
    this.showReviewModal = false;
    this.persistSchedule();
  }

  // ---------------- CREATE / UPDATE + FILE UPLOAD ----------------

  private persistSchedule() {
    const formValue = this.schedulingForm.value;

    // If user is not admin, new schedules start as "Pending"
    const baseStatus = this.isAdmin ? 'Approved' : 'Pending';

    const schedule: ServiceSchedule & { status?: string } = {
      id: this.editingId ?? 0,
      serviceType: formValue.serviceType,
      clientFirstName: formValue.clientFirstName,
      clientLastName: formValue.clientLastName,
      clientPhone: formValue.clientPhone,
      clientEmail: formValue.clientEmail,
      serviceDate: formValue.serviceDate,
      serviceTime: formValue.serviceTime,
      partner1FullName: formValue.partner1FullName,
      partner2FullName: formValue.partner2FullName,
      specialRequests: formValue.specialRequests,
      addressLine: formValue.serviceAddress,
      createdBy: 'test-user',
      createdAt: new Date().toISOString(),
      modifiedBy: 'test-user',
      modifiedAt: new Date().toISOString(),
      requirements: [],
      status: baseStatus
    };

    if (this.editingId) {
      // keep existing status if it already has one
      const existing =
        this.schedules.find((s) => s.id === this.editingId) ||
        this.pendingSchedules.find((s) => s.id === this.editingId);
      if (existing && (existing as any).status) {
        schedule.status = (existing as any).status;
      }

      // Update existing schedule
      this.scheduleService.update(this.editingId, schedule).subscribe({
        next: (updated) => {
          const uploadTasks: Observable<any>[] = [];

          if (formValue.serviceType === 'wedding' && this.uploadedFiles) {
            Object.keys(this.uploadedFiles).forEach((key) => {
              const file = this.uploadedFiles[key][0];
              if (file) {
                uploadTasks.push(
                  this.scheduleService.uploadRequirement(updated.id, file, key)
                );
              }
            });
          }

          const finalizeUpdate = () => {
            const mapped = this.mapSchedule(updated);

            // remove from both lists then reinsert based on status
            this.schedules = this.schedules.filter((s) => s.id !== mapped.id);
            this.pendingSchedules = this.pendingSchedules.filter(
              (s) => s.id !== mapped.id
            );

            if ((mapped as any).status === 'Approved') {
              this.schedules.push(mapped);
            } else {
              this.pendingSchedules.push(mapped);
            }

            this.toastr.success('Schedule updated successfully.');
            this.resetForm();
          };

          if (uploadTasks.length > 0) {
            forkJoin(uploadTasks).subscribe({
              next: () => {
                this.toastr.success('Requirements uploaded successfully.');
                finalizeUpdate();
              },
              error: () => {
                this.toastr.warning('Schedule updated, but some files failed to upload.');
                finalizeUpdate();
              }
            });
          } else {
            finalizeUpdate();
          }
        },
        error: () => {
          this.toastr.error('Failed to update schedule.');
        }
      });
    } else {
      // Create new schedule
      this.scheduleService.create(schedule).subscribe({
        next: (saved) => {
          const uploadTasks: Observable<any>[] = [];

          if (formValue.serviceType === 'wedding' && this.uploadedFiles) {
            Object.keys(this.uploadedFiles).forEach((key) => {
              const file = this.uploadedFiles[key][0];
              if (file) {
                uploadTasks.push(
                  this.scheduleService.uploadRequirement(saved.id, file, key)
                );
              }
            });
          }

          const finalizeCreate = () => {
            const mapped = this.mapSchedule(saved);

            if ((mapped as any).status === 'Approved') {
              this.schedules.push(mapped);
            } else {
              this.pendingSchedules.push(mapped);
            }

            this.toastr.success('Schedule created successfully.');
            this.resetForm();
          };

          if (uploadTasks.length > 0) {
            forkJoin(uploadTasks).subscribe({
              next: () => {
                this.toastr.success(
                  'Wedding schedule and requirements saved successfully.'
                );
                finalizeCreate();
              },
              error: () => {
                this.toastr.warning('Schedule saved, but some files failed to upload.');
                finalizeCreate();
              }
            });
          } else {
            finalizeCreate();
          }
        },
        error: () => {
          this.toastr.error('Failed to create schedule.');
        }
      });
    }
  }

  /**
   * Map raw schedule from API to UI-friendly object
   */
  private mapSchedule(s: any): any {
    const dateOnly = (s.serviceDate || '').split('T')[0];
    const timeStr =
      s.serviceTime && s.serviceTime.length === 5 ? s.serviceTime + ':00' : s.serviceTime;

    const rawStatus = (s.status ?? 'pending').toString().toLowerCase();
    const normalizedStatus =
      rawStatus === 'approved'
        ? 'Approved'
        : rawStatus === 'pending'
          ? 'Pending'
          : s.status || 'Pending';

    return {
      ...s,
      status: normalizedStatus,
      title: `${this.capitalize(s.serviceType)} — ${s.clientFirstName} ${s.clientLastName}`,
      fullDateTime: dateOnly && timeStr ? new Date(`${dateOnly}T${timeStr}`) : null,
      contact: s.clientPhone || s.clientEmail,
      ...this.getColor(s.serviceType)
    };
  }

  /**
   * Approve a pending request → move to Upcoming Appointments
   */
  approveRequest(req: any) {
    if (!req.id) return;

    // Build a clean payload for the API (no UI-only props)
    const payload: ServiceSchedule & { status?: string } = {
      id: req.id,
      serviceType: req.serviceType,
      clientFirstName: req.clientFirstName,
      clientLastName: req.clientLastName,
      clientPhone: req.clientPhone,
      clientEmail: req.clientEmail,
      serviceDate: req.serviceDate,
      serviceTime: req.serviceTime,
      partner1FullName: req.partner1FullName,
      partner2FullName: req.partner2FullName,
      specialRequests: req.specialRequests,
      addressLine: req.addressLine,
      createdBy: req.createdBy ?? 'system',
      createdAt: req.createdAt ?? new Date().toISOString(),
      modifiedBy: 'admin', // or your actual logged-in username
      modifiedAt: new Date().toISOString(),
      requirements: req.requirements || [],
      status: 'Approved'
    };

    this.scheduleService.update(req.id, payload).subscribe({
      next: (saved) => {
        const mapped = this.mapSchedule(saved);

        // remove from pending and add to upcoming
        this.pendingSchedules = this.pendingSchedules.filter((s) => s.id !== req.id);
        this.schedules.push(mapped);

        this.toastr.success('Request approved and moved to Upcoming Appointments.');
      },
      error: () => {
        this.toastr.error('Failed to approve request.');
      }
    });
  }

  /**
   * Populate form for editing (from upcoming OR pending)
   */
  editSchedule(schedule: ServiceSchedule & any) {
    this.editingId = schedule.id;
    this.schedulingForm.patchValue({
      serviceType: schedule.serviceType,
      partner1FullName: schedule.partner1FullName,
      partner2FullName: schedule.partner2FullName,
      clientFirstName: schedule.clientFirstName,
      clientLastName: schedule.clientLastName,
      clientPhone: schedule.clientPhone,
      clientEmail: schedule.clientEmail,
      serviceDate: schedule.serviceDate.toString().split('T')[0],
      serviceTime: schedule.serviceTime,
      specialRequests: schedule.specialRequests,
      serviceAddress: schedule.addressLine
    });

    if (schedule.serviceType.toLowerCase() === 'wedding') {
      this.scheduleService.getRequirements(schedule.id).subscribe((reqs) => {
        this.requirements = reqs;
      });
    }
  }

  /**
   * Delete appointment (removes from both lists)
   */
  deleteAppointment(id: number | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    this.scheduleService.delete(id).subscribe({
      next: () => {
        this.schedules = this.schedules.filter((s) => s.id !== id);
        this.pendingSchedules = this.pendingSchedules.filter((s) => s.id !== id);
        this.toastr.success('Appointment deleted.');
      },
      error: () => {
        this.toastr.error('Failed to delete.');
      }
    });
  }

  /**
   * Reset form to initial state
   */
  resetForm() {
    this.schedulingForm.reset();
    this.uploadedFiles = {};
    this.editingId = null;
  }

  getAppointmentTitle(appt: ServiceSchedule & any): string {
    return `${appt.serviceType} - ${appt.clientFirstName} ${appt.clientLastName}`;
  }

  get isEditing(): boolean {
    return this.editingId !== null && this.editingId !== undefined;
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiceSchedule, ScheduleStatus } from '../../shared/models/service-schedule';
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

  // Admin right (Upcoming approved only)
  schedules: ServiceSchedule[] = [];

  // Admin left (Requests pending + rejected)
  pendingSchedules: ServiceSchedule[] = [];

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

  // ✅ ADMIN UI: hide deleted schedules
  // ✅ Upcoming = Approved only
  // ✅ Requests = Pending + Rejected
  loadSchedules() {
    this.scheduleService.getAll().subscribe({
      next: (data) => {
        const mapped = (data || []).map((s: any) => this.mapSchedule(s));

        // Hide deleted from admin lists (but they still exist in DB for user dashboard)
        const activeOnly = mapped.filter((s: ServiceSchedule) => !s.isDeleted);

        this.schedules = activeOnly.filter((s) => (s.status ?? '') === 'Approved');

        this.pendingSchedules = activeOnly.filter(
          (s) => (s.status ?? '') === 'Pending' || (s.status ?? '') === 'Rejected'
        );
      },
      error: () => this.toastr.error('Failed to load schedules.')
    });
  }

  getColor(type: string) {
    const colors: any = {
      wedding: { colorClass: 'border-l-4 border-pink-500 bg-pink-50', badgeClass: 'bg-pink-100 text-pink-800' },
      baptism: { colorClass: 'border-l-4 border-blue-500 bg-blue-50', badgeClass: 'bg-blue-100 text-blue-800' },
      blessing: { colorClass: 'border-l-4 border-green-500 bg-green-50', badgeClass: 'bg-green-100 text-green-800' },
      funeral: { colorClass: 'border-l-4 border-gray-500 bg-gray-50', badgeClass: 'bg-gray-200 text-gray-800' }
    };
    return colors[(type || '').toLowerCase()] || { colorClass: '', badgeClass: '' };
  }

  getStatusPill(status: string) {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    if (s === 'deleted') return 'bg-gray-200 text-gray-800';
    return 'bg-yellow-100 text-yellow-800';
  }

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

  get filteredPendingSchedules(): ServiceSchedule[] {
    if (this.selectedServiceFilter === 'all') return this.pendingSchedules;
    return this.pendingSchedules.filter(
      (s) => (s.serviceType ?? '').toLowerCase() === this.selectedServiceFilter
    );
  }

  setServiceFilter(key: string) {
    this.selectedServiceFilter = key;
  }

  // ---------- REVIEW FLOW ----------
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

  // ---------- CREATE / UPDATE ----------
  private persistSchedule() {
    const formValue = this.schedulingForm.value;

    const baseStatus: ScheduleStatus = this.isAdmin ? 'Approved' : 'Pending';

    const schedule: ServiceSchedule = {
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
      const existing =
        this.schedules.find((s) => s.id === this.editingId) ||
        this.pendingSchedules.find((s) => s.id === this.editingId);

      if (existing?.status) schedule.status = existing.status;

      this.scheduleService.update(this.editingId, schedule).subscribe({
        next: (updated) => {
          const uploadTasks: Observable<any>[] = [];

          if (formValue.serviceType === 'wedding' && this.uploadedFiles) {
            Object.keys(this.uploadedFiles).forEach((key) => {
              const file = this.uploadedFiles[key][0];
              if (file) uploadTasks.push(this.scheduleService.uploadRequirement(updated.id, file, key));
            });
          }

          const finalize = () => {
            this.loadSchedules();
            this.toastr.success('Schedule updated successfully.');
            this.resetForm();
          };

          if (uploadTasks.length > 0) {
            forkJoin(uploadTasks).subscribe({
              next: () => finalize(),
              error: () => {
                this.toastr.warning('Schedule updated, but some files failed to upload.');
                finalize();
              }
            });
          } else {
            finalize();
          }
        },
        error: () => this.toastr.error('Failed to update schedule.')
      });
    } else {
      this.scheduleService.create(schedule).subscribe({
        next: (saved) => {
          const uploadTasks: Observable<any>[] = [];

          if (formValue.serviceType === 'wedding' && this.uploadedFiles) {
            Object.keys(this.uploadedFiles).forEach((key) => {
              const file = this.uploadedFiles[key][0];
              if (file) uploadTasks.push(this.scheduleService.uploadRequirement(saved.id, file, key));
            });
          }

          const finalize = () => {
            this.loadSchedules();
            this.toastr.success('Schedule created successfully.');
            this.resetForm();
          };

          if (uploadTasks.length > 0) {
            forkJoin(uploadTasks).subscribe({
              next: () => finalize(),
              error: () => {
                this.toastr.warning('Schedule saved, but some files failed to upload.');
                finalize();
              }
            });
          } else {
            finalize();
          }
        },
        error: () => this.toastr.error('Failed to create schedule.')
      });
    }
  }

  private mapSchedule(s: any): ServiceSchedule {
    const dateOnly = (s.serviceDate || '').split('T')[0];
    const timeStr = s.serviceTime && s.serviceTime.length === 5 ? s.serviceTime + ':00' : s.serviceTime;

    const raw = (s.status ?? 'pending').toString().trim().toLowerCase();

    let normalizedStatus: ScheduleStatus = 'Pending';
    if (raw === 'approved' || raw === 'accepted') normalizedStatus = 'Approved';
    else if (raw === 'rejected' || raw === 'declined' || raw === 'denied') normalizedStatus = 'Rejected';
    else if (raw === 'deleted') normalizedStatus = 'Deleted';

    return {
      ...s,
      status: normalizedStatus,
      title: `${this.capitalize(s.serviceType)} — ${s.clientFirstName} ${s.clientLastName}`,
      fullDateTime: dateOnly && timeStr ? new Date(`${dateOnly}T${timeStr}`) : undefined,
      contact: s.clientPhone || s.clientEmail,
      ...this.getColor(s.serviceType)
    };
  }

  // ✅ Approve / Reject = update status only (NOT delete)
  approveRequest(req: ServiceSchedule) {
    if (!req?.id) return;

    const payload: ServiceSchedule = {
      ...req,
      status: 'Approved',
      modifiedBy: 'admin',
      modifiedAt: new Date().toISOString()
    };

    this.scheduleService.update(req.id, payload).subscribe({
      next: () => {
        this.toastr.success('Request approved.');
        this.loadSchedules();
      },
      error: () => this.toastr.error('Failed to approve request.')
    });
  }

  rejectRequest(req: ServiceSchedule) {
    if (!req?.id) return;

    const payload: ServiceSchedule = {
      ...req,
      status: 'Rejected',
      modifiedBy: 'admin',
      modifiedAt: new Date().toISOString()
    };

    this.scheduleService.update(req.id, payload).subscribe({
      next: () => {
        this.toastr.info('Request rejected.');
        this.loadSchedules();
      },
      error: () => this.toastr.error('Failed to reject request.')
    });
  }

  editSchedule(schedule: ServiceSchedule) {
    this.editingId = schedule.id;

    this.schedulingForm.patchValue({
      serviceType: schedule.serviceType,
      partner1FullName: schedule.partner1FullName,
      partner2FullName: schedule.partner2FullName,
      clientFirstName: schedule.clientFirstName,
      clientLastName: schedule.clientLastName,
      clientPhone: schedule.clientPhone,
      clientEmail: schedule.clientEmail,
      serviceDate: (schedule.serviceDate || '').toString().split('T')[0],
      serviceTime: schedule.serviceTime,
      specialRequests: schedule.specialRequests,
      serviceAddress: schedule.addressLine
    });

    if ((schedule.serviceType || '').toLowerCase() === 'wedding') {
      this.scheduleService.getRequirements(schedule.id).subscribe((reqs) => {
        this.requirements = reqs;
      });
    }
  }

  // ✅ Option A: Keep DELETE button, but backend DELETE must be SOFT DELETE
  deleteAppointment(id: number | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    this.scheduleService.delete(id).subscribe({
      next: () => {
        this.toastr.success('Appointment deleted.');
        this.loadSchedules();
      },
      error: () => this.toastr.error('Failed to delete.')
    });
  }

  resetForm() {
    this.schedulingForm.reset();
    this.uploadedFiles = {};
    this.editingId = null;
  }

  getAppointmentTitle(appt: ServiceSchedule): string {
    return `${appt.serviceType} - ${appt.clientFirstName} ${appt.clientLastName}`;
  }

  get isEditing(): boolean {
    return this.editingId !== null && this.editingId !== undefined;
  }
}

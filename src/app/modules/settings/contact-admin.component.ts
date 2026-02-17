import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-contact-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
  <main class="max-w-xl mx-auto px-4 py-8">
    <div class="bg-white rounded-xl shadow p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Contact Admin</h2>
      <p class="text-sm text-gray-500 mb-6">For concerns, you can contact the parish office/admin.</p>

      <div class="border rounded-lg p-4 bg-gray-50">
        <div class="text-sm text-gray-600">Phone Number</div>
        <div class="text-xl font-bold text-gray-800 mt-1">+63 908 188 6393</div>
      </div>
    </div>
  </main>
  `
})
export class ContactAdminComponent {}

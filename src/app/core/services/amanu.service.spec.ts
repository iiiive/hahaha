import { TestBed } from '@angular/core/testing';

import { AmanuService } from './amanu.service';

describe('AmanuService', () => {
  let service: AmanuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmanuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

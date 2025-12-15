import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomiliesComponent } from './homilies.component';

describe('HomiliesComponent', () => {
  let component: HomiliesComponent;
  let fixture: ComponentFixture<HomiliesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomiliesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomiliesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

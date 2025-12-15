import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordOfGodComponent } from './word-of-god.component';

describe('WordOfGodComponent', () => {
  let component: WordOfGodComponent;
  let fixture: ComponentFixture<WordOfGodComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordOfGodComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WordOfGodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

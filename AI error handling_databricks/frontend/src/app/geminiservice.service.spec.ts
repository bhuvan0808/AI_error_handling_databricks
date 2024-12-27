import { TestBed } from '@angular/core/testing';

import { GeminiserviceService } from './geminiservice.service';

describe('GeminiserviceService', () => {
  let service: GeminiserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { SendMoneyPage } from './send.page';
import { ProfileService } from '../../profile/profile.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

describe('SendMoneyPage Contact Deduplication', () => {
  let component: SendMoneyPage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: Location, useValue: { back: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(SendMoneyPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.clear();
  });

  it('deduplicates contacts that exist in both trusted contacts and suggested lists', () => {
    const contacts = component.contacts;
    const names = contacts.map((c) => c.name);

    // Ana Cruz and Marco Santos should only appear once each
    const anaCount = names.filter((n) => n === 'Ana Cruz').length;
    const marcoCount = names.filter((n) => n === 'Marco Santos').length;

    expect(anaCount).toBe(1);
    expect(marcoCount).toBe(1);

    // Set of keys should match length
    const uniqueKeys = new Set(contacts.map((c) => `${c.name}|${c.sub}`));
    expect(contacts.length).toBe(uniqueKeys.size);
  });
});

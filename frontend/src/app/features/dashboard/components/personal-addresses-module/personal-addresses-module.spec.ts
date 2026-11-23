import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PersonalAddressesModule } from './personal-addresses-module';
import { API_BASE_URL } from '../../../../core/config/api-base-url';

describe('PersonalAddressesModule', () => {
  let component: PersonalAddressesModule;
  let fixture: ComponentFixture<PersonalAddressesModule>;

  const mockAddresses = [
    {
      id: 10,
      address_label: 'Home',
      recipient_name: 'Jane Doe',
      mobile: '+919876543210',
      address_line_1: '123 Marine Drive',
      address_line_2: 'Flat 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400020',
      country_code: 'IN',
      is_default: 1,
    },
    {
      id: 11,
      address_label: 'Office',
      recipient_name: 'Jane Doe',
      mobile: '+919876543210',
      address_line_1: '456 Business Park',
      address_line_2: 'Floor 3',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400051',
      country_code: 'IN',
      is_default: 0,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalAddressesModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalAddressesModule);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('addresses', mockAddresses);
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
  });

  it('renders saved addresses and marks default address', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('123 Marine Drive');
    expect(el.textContent).toContain('456 Business Park');
    expect(el.textContent).toContain('Default Address');
    expect(component.isDefault(mockAddresses[0])).toBe(true);
    expect(component.isDefault(mockAddresses[1])).toBe(false);
  });

  it('renders empty state when address list is empty', () => {
    fixture.componentRef.setInput('addresses', []);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No saved addresses yet');
  });

  it('opens create address drawer with empty form', () => {
    component.create();
    expect(component.drawerOpen()).toBe(true);
    expect(component.editingId()).toBeNull();
    expect(component.form().recipient_name).toBe('');
    expect(component.form().address_line_1).toBe('');
  });

  it('opens edit address drawer populated with existing data', () => {
    component.edit(mockAddresses[0]);
    expect(component.drawerOpen()).toBe(true);
    expect(component.editingId()).toBe(10);
    expect(component.form().address_line_1).toBe('123 Marine Drive');
    expect(component.form().city).toBe('Mumbai');
    expect(component.form().is_default).toBe(true);
  });
});

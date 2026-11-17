import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-base-url';

interface PlanRecord { [key: string]: unknown; }

interface PlanEnvelope {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr?: string[];
  data?: { items?: PlanRecord[] } | [];
}

@Component({
  selector: 'app-marketplace-about',
  imports: [RouterLink],
  template: `
    <main class="page">
      <section class="hero"><p class="eyebrow">ABOUT BBG</p><h1>Build. Grow. <span>Connect.</span></h1><p class="lead">A business management and marketplace platform designed to bring businesses, entrepreneurs and customers closer together.</p><a routerLink="/businesses" class="primary-link">Explore businesses <span aria-hidden="true">→</span></a><div class="orb orb-one"></div><div class="orb orb-two"></div></section>
      <section class="story"><div><p class="eyebrow">OUR PURPOSE</p><h2>One place to discover and connect</h2></div><div class="story-copy"><p>BBG brings business discovery and marketplace experiences together. Visitors can explore business profiles, browse categories and keep up with public promotions.</p><p>For entrepreneurs, BBG provides a place to build a business presence and reach a wider community. The platform is designed to make discovery clearer and connections easier.</p></div></section>
      <section class="values"><div class="value"><span>01</span><h3>Discover</h3><p>Explore businesses and offerings across marketplace categories.</p></div><div class="value"><span>02</span><h3>Grow</h3><p>Give businesses a digital presence and a way to share promotions.</p></div><div class="value"><span>03</span><h3>Connect</h3><p>Make it easier for people and businesses to find each other.</p></div></section>
      <section class="plans-section" aria-labelledby="plans-title">
        <div class="plans-heading"><p class="eyebrow">BBG PLANS</p><h2 id="plans-title">Choose the right plan for your business</h2><p>Explore the currently available plans and find the right fit as your business grows.</p></div>
        @if (plansLoading()) {
          <p class="plans-state" role="status">Loading available plans…</p>
        } @else if (plansError()) {
          <p class="plans-state" role="alert">{{ plansError() }}</p>
        } @else if (plans().length) {
          <div class="plans-grid">
            @for (plan of plans(); track plan['plan_id'] ?? plan['id'] ?? plan['plan_code'] ?? $index) {
              <article class="plan-card">
                <p class="plan-label">{{ display(plan, ['plan_type','plan_code','billing_cycle']) || 'BUSINESS PLAN' }}</p>
                <h3>{{ display(plan, ['plan_name','name']) || 'BBG Business Plan' }}</h3>
                <p class="plan-price">{{ display(plan, ['currency']) }} {{ display(plan, ['price','amount']) || 'Contact us' }}<span>{{ display(plan, ['billing_period','billing_cycle']) ? ' / ' + display(plan, ['billing_period','billing_cycle']) : '' }}</span></p>
                <p class="plan-description">{{ display(plan, ['description','plan_description']) || 'A plan to support your business on BBG.' }}</p>
                @if (display(plan, ['features','feature_list'])) {
                  <p class="plan-features">{{ display(plan, ['features','feature_list']) }}</p>
                }
                <a routerLink="/register" class="plan-link">Get started <span aria-hidden="true">→</span></a>
              </article>
            }
          </div>
        } @else {
          <p class="plans-state">There are no active plans available right now. Please check back soon.</p>
        }
      </section>
      <section class="closing"><div><p class="eyebrow">START EXPLORING</p><h2>Find your next business connection.</h2><p>Discover the BBG marketplace and see what's available.</p></div><a routerLink="/categories">Browse categories <span aria-hidden="true">→</span></a></section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{padding-bottom:64px;background:var(--surface-page)}.hero{position:relative;isolation:isolate;overflow:hidden;padding:92px max(24px,calc((100vw - 1180px)/2)) 98px;color:#fff;background:radial-gradient(ellipse at 86% 14%,rgba(245,217,40,.2),transparent 26%),radial-gradient(ellipse at 6% 100%,rgba(107,174,126,.3),transparent 38%),linear-gradient(115deg,#0d3425,#174d35 58%,#246747);border-radius:0 0 28px 28px;box-shadow:0 20px 52px rgba(17,64,43,.13)}
    .hero::before{position:absolute;z-index:-1;top:-180px;right:8%;width:470px;height:470px;border:1px solid rgba(255,255,255,.17);border-radius:50%;box-shadow:0 0 0 38px rgba(255,255,255,.035),0 0 0 82px rgba(255,255,255,.025);content:""}.hero::after{position:absolute;z-index:-1;right:21%;bottom:-130px;width:250px;height:250px;background:rgba(245,217,40,.13);border-radius:50%;filter:blur(2px);content:""}
    .eyebrow{margin:0 0 13px;color:#c5d9ce;font-size:.68rem;font-weight:800;letter-spacing:.16em}h1{position:relative;max-width:850px;margin:0;font-size:clamp(3rem,7vw,5.4rem);font-weight:820;letter-spacing:-.078em;line-height:.98;text-wrap:balance}h1 span{color:#f5d928}.lead{position:relative;max-width:670px;margin:22px 0 30px;color:rgba(255,255,255,.87);font-size:1.08rem;line-height:1.75}
    .primary-link,.closing>a{display:inline-flex;align-items:center;gap:18px;padding:13px 18px;color:#171d19;background:#f5d928;border-radius:9px;font-size:.82rem;font-weight:800;text-decoration:none}.orb{position:absolute;z-index:-1;border:1px solid rgba(255,255,255,.13);border-radius:50%}.orb-one{top:-160px;right:8%;width:480px;height:480px}.orb-two{top:-80px;right:1%;width:320px;height:320px}
    .story{display:grid;grid-template-columns:.8fr 1.2fr;gap:70px;width:min(1180px,calc(100% - 40px));margin:66px auto 0}.story .eyebrow{color:#648071}.story h2,.closing h2{margin:0;color:var(--text-primary);font-size:clamp(1.7rem,3vw,2.5rem);letter-spacing:-.05em;line-height:1.12}.story-copy p{margin:0 0 15px;color:var(--text-secondary);font-size:.94rem;line-height:1.8}
    .values{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:min(1180px,calc(100% - 40px));margin:58px auto 0}.value{padding:25px;background:var(--surface-card);border:1px solid var(--border);border-radius:14px}.value>span{color:#a28c0a;font-size:.72rem;font-weight:850}.value h3{margin:16px 0 7px;color:var(--text-primary);font-size:1.1rem}.value p{margin:0;color:var(--text-secondary);font-size:.83rem;line-height:1.6}
    .plans-section{width:min(1180px,calc(100% - 40px));margin:64px auto 0}.plans-heading{max-width:700px;margin-bottom:24px}.plans-heading .eyebrow{color:#648071}.plans-heading h2{margin:0;color:var(--text-primary);font-size:clamp(1.7rem,3vw,2.5rem);letter-spacing:-.05em}.plans-heading>p:last-child{color:var(--text-secondary);font-size:.9rem;line-height:1.7}.plans-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:16px}.plan-card{display:flex;flex-direction:column;align-items:flex-start;padding:25px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px}.plan-label{margin:0 0 10px;color:#648071;font-size:.65rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.plan-card h3{margin:0;color:var(--text-primary);font-size:1.2rem}.plan-price{margin:14px 0 8px;color:var(--text-primary);font-size:1.65rem;font-weight:850;letter-spacing:-.04em}.plan-price span{font-size:.75rem;font-weight:600;color:var(--text-secondary);letter-spacing:0}.plan-description,.plan-features{color:var(--text-secondary);font-size:.82rem;line-height:1.65}.plan-link{display:inline-flex;align-items:center;gap:12px;margin-top:auto;padding:11px 14px;color:#171d19;background:#f5d928;border-radius:8px;font-size:.77rem;font-weight:800;text-decoration:none}.plans-state{padding:20px;background:var(--surface-card);border:1px solid var(--border);border-radius:12px;color:var(--text-secondary);font-size:.85rem}
    .closing{display:flex;align-items:center;justify-content:space-between;gap:24px;width:min(1180px,calc(100% - 40px));margin:58px auto 0;padding:30px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:15px}.closing .eyebrow{margin-bottom:8px;color:#648071}.closing h2{font-size:1.5rem}.closing p:not(.eyebrow){margin:8px 0 0;color:var(--text-secondary);font-size:.83rem}
    @media(max-width:760px){.hero{padding:56px 22px 62px}.story{grid-template-columns:1fr;gap:20px;margin-top:42px}.values{grid-template-columns:1fr;margin-top:38px}.closing{align-items:flex-start;flex-direction:column;margin-top:38px;padding:23px}}
  `],
})
export class MarketplaceAbout implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  readonly plans = signal<PlanRecord[]>([]);
  readonly plansLoading = signal(true);
  readonly plansError = signal('');

  ngOnInit(): void {
    void this.loadPlans();
  }

  async loadPlans(): Promise<void> {
    this.plansLoading.set(true);
    this.plansError.set('');
    try {
      const response = await firstValueFrom(this.http.post<PlanEnvelope>(
        `${this.apiBaseUrl}/api/v1/subscriptions/plans/list`,
        { subscriptionParam: { actionType: 'listActivePlans', actionData: {} } },
      ));
      if (response.status !== 'SUCCESS') throw new Error(response.msgArr?.join(' ') || 'Plans could not be loaded.');
      const data = response.data as { items?: PlanRecord[] } | undefined;
      this.plans.set(data?.items ?? []);
    } catch {
      this.plansError.set('We couldn’t load the available plans right now. Please try again later.');
    } finally {
      this.plansLoading.set(false);
    }
  }

  display(plan: PlanRecord, keys: string[]): string {
    for (const key of keys) {
      const value = plan[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) return value.map((item) => String(item)).join(' · ');
        if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(String).join(' · ');
        return String(value);
      }
    }
    return '';
  }
}

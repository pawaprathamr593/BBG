import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `<section class="welcome-section">
    <div><p class="eyebrow">BUSINESS MANAGEMENT &amp; MARKETPLACE PLATFORM</p><h1>A clearer view of your business.</h1><p class="welcome-copy">BBG brings business operations and marketplace experiences together in one connected platform. Your workspace foundation is being prepared.</p></div>
    <div class="welcome-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-core"><span>B</span></div><div class="art-node node-one"></div><div class="art-node node-two"></div><div class="art-node node-three"></div></div>
  </section>
  <section class="status-section" aria-labelledby="foundation-title">
    <div class="section-heading"><div><p class="eyebrow">GETTING STARTED</p><h2 id="foundation-title">Your platform foundation</h2></div><span class="status-pill"><span></span> Foundation stage</span></div>
    <div class="foundation-grid">
      <article class="foundation-card"><span class="card-icon icon-backend">01</span><div><h3>Backend foundation</h3><p>Yii 3 architecture and environment-aware database configuration.</p><span class="card-state">In progress</span></div></article>
      <article class="foundation-card"><span class="card-icon icon-frontend">02</span><div><h3>Responsive frontend</h3><p>A mobile-first Angular application shell and shared design foundation.</p><span class="card-state">In progress</span></div></article>
      <article class="foundation-card"><span class="card-icon icon-deploy">03</span><div><h3>Deployment readiness</h3><p>Separate local and production configuration for a future live domain.</p><span class="card-state">Prepared</span></div></article>
    </div>
  </section>
  <section class="bottom-note"><div class="note-symbol">i</div><div><strong>Workspace preview</strong><p>This screen is a foundation placeholder. Business workflows and live data will be added only after their requirements and API contracts are approved.</p></div></section>`,
  styles: [':host{display:block}'],
})
export class Dashboard {}

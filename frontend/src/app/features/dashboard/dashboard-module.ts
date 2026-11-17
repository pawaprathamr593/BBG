import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base-url';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

type EnvelopeKey = 'authParam' | 'businessParam' | 'customerParam' | 'orderParam' | 'enquiryParam' | 'paymentParam' | 'promotionParam' | 'subscriptionParam' | 'adminParam' | 'tenantParam' | 'dashboardParam';
interface ApiEnvelope<T = unknown> { status: 'SUCCESS' | 'FAILED' | 'EXCEPTION'; msgArr?: string[]; data?: T | []; }
interface DataRecord { [key: string]: unknown; }

@Component({
  selector: 'app-dashboard-module',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="module-page">
      <header class="page-heading">
        <div>
          <p class="intro">{{ description() }}</p>
        </div>
        <div class="heading-buttons">
          @if (section() === 'profile') { <button class="secondary-action" type="button" (click)="editBusinessProfile()" [disabled]="busy()">Edit profile</button> }
          @if (section() === 'storefront') {
            <button class="secondary-action" type="button" (click)="editStorefront()" [disabled]="busy()">Edit settings</button>
            <button class="secondary-action" type="button" (click)="toggleStorefront()" [disabled]="busy()">{{ storefrontStatus() === 'PUBLISHED' ? 'Unpublish' : 'Publish' }} storefront</button>
          }
          @if (section() === 'promotions') { <button class="secondary-action" type="button" (click)="createPromotion()" [disabled]="busy()">+ New promotion</button> }
          @if (section() === 'customers' && !activeTenantId()) { <button class="secondary-action" type="button" (click)="createAddress()" [disabled]="busy()">+ Add address</button> }
          @if (section() === 'categories') { <button class="secondary-action" type="button" (click)="createCategory()" [disabled]="busy()">+ New category</button> }
          <button class="refresh" type="button" (click)="load()" [disabled]="loading()">↻ Refresh</button>
        </div>
      </header>


      @if (notice()) {
        <div class="notice" role="status">{{ notice() }}</div>
      }
      @if (loading()) {
        <section class="state-panel" role="status"><span class="spinner"></span><div><strong>Loading {{ title().toLowerCase() }}</strong><p>Retrieving the latest information from BBG.</p></div></section>
      } @else if (error()) {
        <section class="state-panel error" role="alert"><strong>We couldn’t load this section.</strong><p>{{ error() }}</p><button type="button" (click)="load()">Try again</button></section>
      } @else if (unsupported()) {
        <section class="state-panel"><span class="state-icon">ⓘ</span><strong>{{ unsupportedTitle() }}</strong><p>{{ unsupported() }}</p></section>
      } @else {
        @if (summaryEntries().length && !(section() === 'customers' && !activeTenantId())) {
          <section class="summary-grid" aria-label="Summary">
            @for (entry of summaryEntries(); track entry.key) {
              <article class="summary-card"><span>{{ humanize(entry.key) }}</span><strong>{{ formatValue(entry.value) }}</strong></article>
            }
          </section>
        }

        @if (section() === 'customers' && !activeTenantId() && summary()) {
          <section class="personal-profile-card" aria-labelledby="personal-profile-title">
            <div class="personal-profile-heading">
              <div><p class="eyebrow">YOUR BBG ACCOUNT</p><h2 id="personal-profile-title">Personal details</h2><p>These details belong to your BBG account and are used across your customer activity.</p></div>
              <span class="profile-avatar">{{ profileInitials() }}</span>
            </div>
            <div class="personal-profile-details">
              <div><span>Full name</span><strong>{{ summary()?.['full_name'] || 'Not provided' }}</strong></div>
              <div><span>Email address</span><strong>{{ summary()?.['email'] || 'Not provided' }}</strong></div>
              <div><span>Mobile number</span><strong>{{ summary()?.['mobile'] || 'Not provided' }}</strong></div>
            </div>
            <div class="password-settings">
              <div><strong>Account password</strong><p>{{ summary()?.['has_password'] ? 'A password is already set for your account.' : 'You signed in without a password. You can set one to also sign in using your email or mobile number.' }}</p></div>
              @if (!showPasswordForm()) {
                <button class="secondary-action" type="button" (click)="openPasswordForm()">{{ summary()?.['has_password'] ? 'Change password' : 'Set password' }}</button>
              }
            </div>
            @if (showPasswordForm()) {
              <form class="password-form" (submit)="$event.preventDefault(); updatePassword()">
                @if (summary()?.['has_password']) {
                  <label>Current password<input type="password" autocomplete="current-password" [value]="currentPassword()" (input)="currentPassword.set(($any($event.target)).value)" required></label>
                }
                <label>New password<input type="password" autocomplete="new-password" minlength="8" [value]="newPassword()" (input)="newPassword.set(($any($event.target)).value)" required></label>
                <label>Confirm new password<input type="password" autocomplete="new-password" minlength="8" [value]="confirmPassword()" (input)="confirmPassword.set(($any($event.target)).value)" required></label>
                @if (passwordError()) { <p class="password-error" role="alert">{{ passwordError() }}</p> }
                <div class="password-form-actions"><button class="refresh" type="button" (click)="closePasswordForm()" [disabled]="busy()">Cancel</button><button class="secondary-action" type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : (summary()?.['has_password'] ? 'Update password' : 'Set password') }}</button></div>
              </form>
            }
          </section>
        }

        @if (section() === 'payment-qr-settings') {
          <section class="qr-settings-card">
            <div class="section-title"><div><p class="eyebrow">PLATFORM PAYMENT SETTINGS</p><h2>UPI payment QR</h2><p>Changing the QR affects new subscription requests only. Existing requests retain their captured payment instructions.</p></div></div>
            @if (summary()?.['qr_url']) { <img class="payment-qr-preview" [src]="$any(summary()?.['qr_url'])" alt="Current BBG UPI payment QR"> }
            <label>Payee name<input type="text" maxlength="150" [value]="qrPayeeName()" (input)="qrPayeeName.set(($any($event.target)).value)" placeholder="BBG account name"></label>
            <label>UPI ID<input type="text" maxlength="150" [value]="qrUpiId()" (input)="qrUpiId.set(($any($event.target)).value)" placeholder="payments@upi"></label>
            <label>Payment instructions<textarea rows="3" maxlength="1000" [value]="qrInstructions()" (input)="qrInstructions.set(($any($event.target)).value)" placeholder="Optional instructions for business owners"></textarea></label>
            <label>New QR image<input type="file" accept="image/jpeg,image/png,image/webp" (change)="setPaymentQrFile($event)" [disabled]="busy()"><small>JPG, PNG or WEBP, up to 10 MB. Uploading a new QR creates a new version.</small></label>
            @if (qrFile()) { <p class="qr-file-name">Selected: {{ qrFile()?.name }}</p> }
            <button type="button" class="secondary-action" (click)="savePaymentQrConfig()" [disabled]="busy() || !qrPayeeName().trim() || !qrUpiId().trim() || !qrFile()">{{ busy() ? 'Saving…' : 'Save payment QR configuration' }}</button>
          </section>
        }

        @if (section() === 'subscriptions' && plans().length) {
          <section class="plans-section">
            <div class="section-title"><div><p class="eyebrow">AVAILABLE PLANS</p><h2>Choose a business plan</h2></div></div>
            <div class="plans-grid">
              @for (plan of plans(); track recordId(plan, 'plan_id')) {
                <article class="plan-card">
                  <h3>{{ valueOf(plan, ['plan_name', 'name', 'plan_code']) }}</h3>
                  <strong class="plan-price">{{ valueOf(plan, ['price', 'amount']) }} {{ valueOf(plan, ['currency']) }}</strong>
                  <p>{{ valueOf(plan, ['description', 'plan_description']) }}</p>
                  <button type="button" (click)="requestPlan(plan)" [disabled]="busy()">{{ pendingPlanId() === recordId(plan, 'plan_id') ? 'Requesting…' : 'Request this plan' }}</button>
                </article>
              }
            </div>
          </section>
        }

        @if (filteredItems().length) {
          <section class="records-section">
            <div class="section-title">
              <div><p class="eyebrow">LIVE RECORDS</p><h2>{{ recordsHeading() }}</h2></div>
              <span class="record-count">{{ filteredItems().length }} shown</span>
            </div>
            <div class="records-list">
              @for (item of filteredItems(); track recordId(item, 'id')) {
                <article class="record-card">
                  <div class="record-head">
                    <div><strong>{{ recordTitle(item) }}</strong><span>{{ recordSubtitle(item) }}</span></div>
                    @if (statusOf(item)) { <span class="status-chip" [class]="statusClass(statusOf(item))">{{ humanize(statusOf(item)) }}</span> }
                  </div>
                  <div class="record-fields">
                    @for (entry of recordEntries(item); track entry.key) {
                      <div><span>{{ humanize(entry.key) }}</span><strong>{{ formatValue(entry.value) }}</strong></div>
                    }
                  </div>
                  @if (section() === 'subscription-approval') {
                    <button type="button" class="secondary-action" (click)="openSubscriptionReview(item)" [disabled]="busy()">View business details, receipts & history</button>
                  }
                  @if (section() === 'subscriptions' && item['payment_qr_url']) {
                    <div class="subscription-payment-qr">
                      <img [src]="$any(item['payment_qr_url'])" alt="UPI payment QR for this subscription">
                      <div><strong>Pay using UPI</strong><span>{{ item['payment_payee_name'] }}</span><span>{{ item['payment_upi_id'] }}</span><small>QR version {{ item['payment_qr_version'] }} · retained for this request</small></div>
                    </div>
                    @if (item['payment_instructions']) { <p class="payment-instructions">{{ item['payment_instructions'] }}</p> }
                  }
                  @if (section() === 'promotions' && mediaOf(item).length) {
                    <div class="post-media-strip" aria-label="Post attachments">
                      @for (media of mediaOf(item); track media['id']) {
                        <div class="post-media-item">
                          @if (media['url'] && media['media_type'] === 'IMAGE') { <img [src]="$any(media['url'])" [alt]="'Post image ' + media['id']"> }
                          @else if (media['url'] && media['media_type'] === 'VIDEO') { <video controls [src]="$any(media['url'])" aria-label="Post video attachment"></video> }
                          @else if (media['url'] && media['media_type'] === 'AUDIO') { <audio controls [src]="$any(media['url'])" aria-label="Post audio attachment"></audio> }
                          @else if (media['url']) { <a [href]="$any(media['url'])" target="_blank" rel="noopener">Open {{ media['media_type'] }} attachment</a> }
                          @else { <span>{{ media['media_type'] }} attachment</span> }
                          @if (statusOf(item).toUpperCase() !== 'PUBLISHED') { <button type="button" (click)="removePromotionAttachment(item,media)" [disabled]="busy()">Remove</button> }
                        </div>
                      }
                    </div>
                  }

                  @if (section() === 'subscriptions' && statusOf(item).toUpperCase() === 'PENDING' && item['latest_proof_review_status'] === 'PENDING') {
                    <p class="payment-instructions">Your receipt was submitted on {{ formatValue(item['latest_proof_submitted_on']) }} and is awaiting Platform Admin review.</p>
                  }
                  @if (section() === 'subscriptions' && ['PENDING','REJECTED'].includes(statusOf(item).toUpperCase()) && item['latest_proof_review_status'] !== 'PENDING') {
                    <label class="upload-proof">Upload payment proof
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" [disabled]="busy()" (change)="uploadProof($event, item)" />
                    </label>
                    @if (proofDrafts()[recordId(item,'subscription_id')]) {
                      <div class="proof-ready" role="status">
                        <span>Receipt uploaded: {{ proofDrafts()[recordId(item,'subscription_id')].fileName }}</span>
                        <button type="button" (click)="submitProof(item)" [disabled]="busy()">Submit for Review</button>
                      </div>
                    }
                  }
                  @if (actionsFor(item).length) {
                    <div class="record-actions">
                      @for (action of actionsFor(item); track action.key) {
                        <button type="button" [class.danger]="action.danger" (click)="runAction(action.key, item)" [disabled]="busy()">{{ action.label }}</button>
                      }
                    </div>
                  }
                </article>
              }
            </div>
          </section>
        } @else if (!summaryEntries().length && !(section() === 'subscriptions' && plans().length)) {
          <section class="state-panel empty"><span class="state-icon">⌑</span><strong>Nothing to show yet</strong><p>There are no records available for this section in your current area.</p></section>
        }
      }
      @if (subscriptionReview()) {
        <div class="composer-backdrop" (click)="subscriptionReview.set(null)">
          <section class="promotion-composer subscription-review-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-review-title" (click)="$event.stopPropagation()">
            <header><div><p class="eyebrow">PLATFORM ADMIN / SUBSCRIPTION REVIEW</p><h2 id="subscription-review-title">Subscription #{{ subscriptionReviewDetail()?.['id'] }}</h2><p>Business registration, selected plan, captured payment instructions and submission history.</p></div><button type="button" class="composer-close" (click)="subscriptionReview.set(null)">×</button></header>
            @if (subscriptionReviewDetail(); as detail) {
              <h3>Business details</h3>
              <div class="review-detail-grid">
                @for (key of ['tenant_code','tenant_type','tenant_status','business_name','business_slug','business_description','primary_category_id','business_email','business_phone','whatsapp_number','logo_path','cover_image_path','address_line_1','address_line_2','city','state','postal_code','country_code','latitude','longitude','business_approval_status','business_publication_status','business_rejection_reason']; track key) {
                  <div><span>{{ humanize(key) }}</span><strong>{{ detail[key] || '—' }}</strong></div>
                }
              </div>
              <h3>Plan & payment instructions</h3>
              <div class="review-detail-grid">
                @for (key of ['plan_name','plan_code','billing_cycle','amount','currency','subscription_status','payment_payee_name','payment_upi_id','payment_qr_version','payment_instructions']; track key) {
                  <div><span>{{ humanize(key) }}</span><strong>{{ detail[key] || '—' }}</strong></div>
                }
              </div>
              @if (detail['payment_qr_file_url']) { <img class="payment-qr-preview" [src]="$any(detail['payment_qr_file_url'])" alt="Captured payment QR"> }
            }
            <h3>Payment receipts</h3>
            @for (proof of subscriptionReviewProofs(); track proof['id']) {
              <div class="review-history-row"><div><strong>{{ proof['review_status'] }}</strong><span>{{ proof['payment_reference'] || 'No payment reference' }} · {{ formatValue(proof['submitted_on']) }}</span></div>@if (proof['proof_file_url']) { <a [href]="$any(proof['proof_file_url'])" target="_blank" rel="noopener">Open receipt</a> }</div>
            } @empty { <p>No receipt submissions were found.</p> }
            <h3>Decision history</h3>
            @for (entry of subscriptionReviewHistory(); track entry['id']) {
              <div class="review-history-row"><div><strong>{{ entry['decision'] }}</strong><span>{{ entry['review_reason'] || 'No rejection reason recorded' }}</span><small>{{ entry['reviewer_name'] || 'System' }} · {{ formatValue(entry['reviewed_on']) }}</small></div></div>
            } @empty { <p>No review decisions have been recorded yet.</p> }
          </section>
        </div>
      }
      @if (showPromotionComposer()) {
        <div class="composer-backdrop" (click)="closePromotionComposer()">
          <section class="promotion-composer" role="dialog" aria-modal="true" aria-labelledby="promotion-composer-title" (click)="$event.stopPropagation()">
            <header><div><p class="eyebrow">BUSINESS WORKSPACE / PROMOTIONS</p><h2 id="promotion-composer-title">Create promotion</h2><p>Prepare your post and attach multiple media files.</p></div><button type="button" class="composer-close" (click)="closePromotionComposer()" [disabled]="promotionMediaBusy()">×</button></header>
            <label>Post title <input type="text" maxlength="180" [value]="promotionTitle()" (input)="setPromotionField('title',$event)" placeholder="e.g. Festive season offer"></label>
            <label>Post content <textarea rows="5" maxlength="10000" [value]="promotionContent()" (input)="setPromotionField('content',$event)" placeholder="Tell customers about your offer…" required></textarea></label>
            <label>Valid until <input type="datetime-local" [value]="promotionValidUntil()" (input)="setPromotionField('validUntil',$event)"><small>Optional. Leave blank for no expiry date.</small></label>
            <div class="post-upload-zone">
              <div class="post-file-picker" (dragover)="allowPromotionMediaDrop($event)" (drop)="dropPromotionMedia($event)"><span>＋</span><strong>Add media files</strong><small>Images, videos, audio and PDF · multiple selection · max 100 MB per file</small><input type="file" aria-label="Add promotion media files" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,application/pdf,text/plain,text/csv,application/rtf" (change)="selectPromotionMedia($event)" [disabled]="promotionMediaBusy()"></div>
              @if (promotionFiles().length) {
                <div class="post-file-list">
                  @for (file of promotionFiles(); track $index) {
                    <div><span>{{ mediaLabel(file.type) }}</span><strong>{{ file.name }}</strong><small>{{ fileSize(file.size) }}</small><button type="button" (click)="removePromotionMedia($index)" [disabled]="promotionMediaBusy()">Remove</button></div>
                  }
                </div>
              }
            </div>
            @if (promotionError()) { <p class="composer-error" role="alert">{{ promotionError() }}</p> }
            @if (promotionMediaBusy()) { <div class="composer-progress" role="status"><progress [value]="promotionUploadProgress()" max="100"></progress><span>Uploading attachments… {{ promotionUploadProgress() }}%</span></div> }
            <footer><button type="button" class="refresh" (click)="closePromotionComposer()" [disabled]="promotionMediaBusy()">Cancel</button><button type="button" class="secondary-action" (click)="submitPromotion()" [disabled]="promotionMediaBusy() || !promotionContent().trim()">{{ promotionMediaBusy() ? 'Uploading…' : (promotionFiles().length ? 'Save post & upload media' : 'Create draft') }}</button></footer>
          </section>
        </div>
      }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
.proof-ready{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--surface-subtle);font-size:.75rem}.proof-ready button{padding:8px 12px;border:0;border-radius:7px;background:var(--brand);color:#fff;font:inherit;font-weight:800;cursor:pointer}.proof-ready button:disabled{opacity:.6;cursor:wait}
        .post-media-strip{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.post-media-item{display:grid;justify-items:start;gap:4px}.post-media-strip img{width:72px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--border)}.post-media-strip video{width:120px;height:72px;border-radius:8px;background:#111}.post-media-strip audio{width:min(240px,100%);height:36px}.post-media-strip a,.post-media-strip span{align-self:center;padding:8px 10px;border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);font-size:.72rem;text-decoration:none}.post-media-item button{border:0;background:transparent;color:#c44747;font-size:.65rem;cursor:pointer}
    .composer-backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:18px;background:rgba(10,18,15,.62)}.promotion-composer{width:min(680px,100%);max-height:90vh;overflow:auto;padding:24px;background:var(--surface-card);color:var(--text-primary);border:1px solid var(--border);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.25)}.promotion-composer header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.promotion-composer header .eyebrow{margin:0 0 7px}.promotion-composer h2{margin:0;font-size:1.35rem}.promotion-composer header p:last-child{margin:6px 0 0;color:var(--text-secondary);font-size:.78rem}.composer-close{border:0;background:transparent;color:var(--text-secondary);font-size:1.5rem;cursor:pointer}.promotion-composer>label{display:grid;gap:7px;margin:13px 0;font-size:.78rem;font-weight:700}.promotion-composer input[type=text],.promotion-composer input[type=datetime-local],.promotion-composer textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid var(--border);border-radius:9px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.82rem}.promotion-composer label small{font-weight:400;color:var(--text-secondary)}.post-upload-zone{margin:16px 0}.post-file-picker{display:grid;justify-items:center;gap:5px;padding:22px;border:1px dashed var(--border);border-radius:11px;background:var(--surface-page);cursor:pointer}.post-file-picker>span{font-size:1.5rem;color:var(--brand)}.post-file-picker strong{font-size:.8rem}.post-file-picker small{font-size:.68rem;color:var(--text-secondary)}.post-file-picker input{max-width:100%;margin-top:7px;font-size:.7rem}.post-file-list{display:grid;gap:7px;margin-top:10px}.post-file-list>div{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:5px 10px;align-items:center;padding:9px;border:1px solid var(--border);border-radius:8px}.post-file-list span{grid-row:span 2;font-size:.62rem;font-weight:800;color:var(--brand)}.post-file-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.74rem}.post-file-list small{font-size:.66rem;color:var(--text-secondary)}.post-file-list button{grid-column:3;grid-row:1/3;border:0;background:transparent;color:#bf4545;font:inherit;font-size:.7rem;cursor:pointer}.promotion-composer footer{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.composer-error{color:#c43d3d;font-size:.78rem}.composer-progress{display:flex;align-items:center;gap:10px;color:var(--text-secondary);font-size:.72rem}.composer-progress progress{flex:1;height:7px;accent-color:var(--brand)}
    .module-page{width:100%;max-width:none;box-sizing:border-box;margin:0;padding:36px 32px 64px}
    .page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:25px}
    .back-link{display:inline-block;margin-bottom:20px;color:var(--text-secondary);font-size:.78rem;font-weight:700;text-decoration:none}
    .back-link:hover{color:var(--brand)}.eyebrow{margin:0 0 8px;color:var(--brand);font-size:.67rem;font-weight:850;letter-spacing:.14em}
    h1{margin:0;font-size:clamp(2rem,4vw,2.8rem);letter-spacing:-.05em;line-height:1.12}.intro{max-width:700px;margin:10px 0 0;color:var(--text-secondary);font-size:.9rem;line-height:1.6}
    .refresh,.secondary-action,.record-actions button,.state-panel button{min-height:40px;padding:0 14px;color:var(--text-primary);background:var(--surface-card);border:1px solid var(--border);border-radius:9px;font:inherit;font-size:.76rem;font-weight:750;cursor:pointer}
    .heading-buttons{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.secondary-action{min-height:40px;padding:0 13px;color:var(--brand);background:var(--surface-card);border:1px solid color-mix(in srgb,var(--brand) 30%,var(--border));border-radius:9px;font:inherit;font-size:.75rem;font-weight:750;cursor:pointer}.refresh:disabled,.secondary-action:disabled,.record-actions button:disabled{opacity:.55;cursor:wait}
    .section-nav{display:flex;gap:7px;overflow:auto;padding:4px 0 17px;margin-bottom:22px;border-bottom:1px solid var(--border)}
    .section-nav a{flex:0 0 auto;padding:9px 12px;color:var(--text-secondary);border-radius:8px;font-size:.75rem;font-weight:750;text-decoration:none}
    .section-nav a.active{color:var(--brand);background:var(--brand-soft)}
    .notice{margin:0 0 16px;padding:12px 15px;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px;font-size:.8rem}
    .state-panel{display:flex;align-items:center;justify-content:center;gap:14px;min-height:170px;padding:28px;background:var(--surface-card);border:1px solid var(--border);border-radius:14px}
    .state-panel>div{display:grid;gap:4px}.state-panel p{max-width:560px;margin:5px 0 0;color:var(--text-secondary);font-size:.8rem;line-height:1.6}.state-panel.error{display:block;text-align:center;border-color:#d88a83}.state-panel.error button{margin-top:14px}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}
    .state-icon{display:grid;width:42px;height:42px;place-items:center;color:var(--brand);background:var(--brand-soft);border-radius:12px;font-size:1.35rem}
    .personal-profile-card{margin:0 0 25px;padding:22px;background:var(--surface-card);border:1px solid var(--border);border-radius:14px}.personal-profile-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.personal-profile-heading h2{margin:0;font-size:1.25rem;letter-spacing:-.03em}.personal-profile-heading>div>p:last-child{margin:7px 0 0;color:var(--text-secondary);font-size:.78rem}.profile-avatar{display:grid;width:48px;height:48px;flex:0 0 48px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand);font-weight:850}.personal-profile-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:22px}.personal-profile-details>div{display:grid;min-width:0;gap:6px}.personal-profile-details span{color:var(--text-secondary);font-size:.68rem;font-weight:700}.personal-profile-details strong{overflow-wrap:anywhere;font-size:.84rem}.password-settings{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:22px;padding-top:18px;border-top:1px solid var(--border)}.password-settings p{margin:5px 0 0;color:var(--text-secondary);font-size:.75rem;line-height:1.5}.password-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}.password-form label{display:grid;gap:6px;font-size:.72rem;font-weight:750}.password-form input{width:100%;box-sizing:border-box;min-height:42px;padding:0 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.78rem}.password-form-actions{display:flex;grid-column:1/-1;justify-content:flex-end;gap:8px}.password-error{grid-column:1/-1;margin:0;color:#bd4941;font-size:.74rem}
    .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:26px}
    .summary-card{display:grid;gap:7px;padding:17px;background:var(--surface-card);border:1px solid var(--border);border-radius:12px}
    .summary-card span,.record-fields span{color:var(--text-secondary);font-size:.68rem;font-weight:700}.summary-card strong{font-size:1.45rem;letter-spacing:-.04em}
    .section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:30px 0 15px}.section-title .eyebrow{margin-bottom:5px}.section-title h2{margin:0;font-size:1.25rem;letter-spacing:-.03em}
    .record-count{padding:7px 10px;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:8px;font-size:.7rem;font-weight:750}
    .records-list{display:grid;gap:12px}.record-card{padding:18px 20px;background:var(--surface-card);border:1px solid var(--border);border-radius:13px}
    .record-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.record-head>div{display:grid;gap:5px}.record-head>div strong{font-size:.93rem}.record-head>div span{color:var(--text-secondary);font-size:.72rem}
    .status-chip{flex:0 0 auto;padding:6px 9px;color:var(--text-secondary);background:var(--surface-subtle);border-radius:7px;font-size:.65rem;font-weight:800}
    .status-chip.good{color:#168253;background:#e9f7ef}.status-chip.warn{color:#98691a;background:#fff5df}.status-chip.bad{color:#b34840;background:#fff0ee}
    .record-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)}
    .record-fields>div{display:grid;gap:5px;min-width:0}.record-fields strong{overflow-wrap:anywhere;font-size:.76rem;font-weight:700}
    .upload-proof{display:inline-flex;align-items:center;gap:10px;margin-top:14px;padding:9px 12px;color:var(--brand);background:var(--brand-soft);border:1px solid color-mix(in srgb,var(--brand) 22%,var(--border));border-radius:8px;font-size:.73rem;font-weight:750}.upload-proof input{max-width:210px;color:var(--text-secondary);font-size:.7rem}.record-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.record-actions button{min-height:34px;color:var(--brand);border-color:color-mix(in srgb,var(--brand) 25%,var(--border))}.record-actions button.danger{color:#b34840;border-color:#e7c1bd}
    .plans-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.plan-card{padding:20px;background:var(--surface-card);border:1px solid var(--border);border-radius:13px}.plan-card h3{margin:0 0 10px;font-size:1rem}.plan-price{font-size:1.35rem;letter-spacing:-.04em}.plan-card p{min-height:38px;color:var(--text-secondary);font-size:.76rem;line-height:1.55}.plan-card button{width:100%;min-height:38px;color:white;background:var(--brand);border:0;border-radius:8px;font-size:.75rem;font-weight:800;cursor:pointer}
    .empty{flex-direction:column;text-align:center}.empty p{max-width:480px}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.record-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:600px){.personal-profile-card{padding:16px}.personal-profile-details{grid-template-columns:1fr;gap:12px}.password-settings{align-items:flex-start;flex-direction:column}.password-form{grid-template-columns:1fr}.password-form-actions,.password-error{grid-column:1}.module-page{padding:28px 16px 54px}.page-heading{align-items:flex-start;flex-direction:column}.refresh{width:100%}.summary-grid{gap:8px}.summary-card{padding:13px}.summary-card strong{font-size:1.2rem}.record-card{padding:15px}.record-fields{grid-template-columns:1fr 1fr;gap:11px}.plans-grid{grid-template-columns:1fr}.section-title{align-items:flex-start}}
  `],
})
export class DashboardModule implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly auth = inject(AuthService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly section = signal('profile');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly activeTenantId = this.workspace.activeTenantId;
  readonly isPersonalContext = computed(() => this.workspace.activeTenantId() === null
    && !this.workspace.permissions().some((permission) => permission.scope_type === 'PLATFORM'));
  readonly error = signal('');
  readonly notice = signal('');
  readonly unsupported = signal('');
  readonly unsupportedTitle = signal('This section is not available');
  readonly items = signal<DataRecord[]>([]);
  readonly filterSearch = signal('');
  readonly filterStatus = signal('');
  readonly filterFrom = signal('');
  readonly filterTo = signal('');
  readonly filteredItems = computed(() => {
    const search = this.filterSearch().trim().toLowerCase();
    const status = this.filterStatus().toUpperCase();
    const from = this.filterFrom();
    const to = this.filterTo();
    return this.items().filter((item) => {
      if (search && !Object.values(item).some((value) => value !== null && typeof value !== 'object' && String(value).toLowerCase().includes(search))) return false;
      const statusValue = ['order_status','payment_status','enquiry_status','publication_status','approval_status','subscription_status','status'].map((key) => item[key]).find((value) => value !== undefined && value !== null);
      if (status && String(statusValue ?? '').toUpperCase() !== status) return false;
      const dateValue = ['created_on','created_at','order_date','enquiry_date','payment_date','updated_on'].map((key) => item[key]).find((value) => value !== undefined && value !== null);
      if (from || to) {
        const date = dateValue ? new Date(String(dateValue)) : null;
        if (!date || Number.isNaN(date.getTime())) return false;
        const day = date.toISOString().slice(0,10);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  });
  readonly summary = signal<DataRecord | null>(null);
  readonly showPasswordForm = signal(false);
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly passwordError = signal('');
  readonly profileInitials = computed(() => String(this.summary()?.['full_name'] ?? 'BB').trim().split(/\s+/).slice(0,2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BB');
  readonly plans = signal<DataRecord[]>([]);
  readonly pendingPlanId = signal<number | null>(null);
  readonly proofDrafts = signal<Record<number,{objectKey:string;paymentReference:string;fileName:string}>>({});
  readonly qrPayeeName = signal('');
  readonly qrUpiId = signal('');
  readonly qrInstructions = signal('');
  readonly qrFile = signal<File | null>(null);
  readonly subscriptionReview = signal<DataRecord | null>(null);
  readonly showPromotionComposer = signal(false);
  readonly promotionTitle = signal('');
  readonly promotionContent = signal('');
  readonly promotionValidUntil = signal('');
  readonly promotionFiles = signal<File[]>([]);
  readonly promotionMediaBusy = signal(false);
  readonly promotionUploadProgress = signal(0);
  readonly promotionError = signal('');
  readonly draftPromotionId = signal<number | null>(null);
  readonly promotionUploadedCount = signal(0);

  readonly title = computed(() => {
    const section = this.section();
    if (this.isPersonalContext()) {
      const personalTitles: Record<string, string> = {
        customers: 'My Profile & Addresses',
        enquiries: 'My Enquiries',
        orders: 'My Orders',
        payments: 'My Payments',
      };
      if (personalTitles[section]) return personalTitles[section];
    }
    return this.config[section]?.title ?? (this.workspace.activeTenantId() === null ? 'My Account' : 'Business Workspace');
  });
  readonly description = computed(() => {
    const personalDescriptions: Record<string, string> = {
      customers: 'Manage your personal details and saved delivery addresses.',
      enquiries: 'Review your enquiries and conversations with businesses.',
      orders: 'Track orders you have placed with businesses on BBG.',
      payments: 'Review payments associated with your customer orders.',
    };
    return this.isPersonalContext()
      ? personalDescriptions[this.section()] ?? 'Manage your personal BBG account.'
      : this.config[this.section()]?.description ?? 'Manage your business operations.';
  });
  readonly contextLabel = computed(() => this.workspace.activeTenantId() !== null
    ? 'BUSINESS WORKSPACE'
    : this.workspace.permissions().some((permission) => permission.scope_type === 'PLATFORM')
      ? 'PLATFORM ADMINISTRATION'
      : 'MY ACCOUNT');
  readonly summaryEntries = computed(() => {
    const source = this.summary();
    if (!source) return [];
    const entries: Array<{key:string;value:unknown}> = [];
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && typeof value !== 'object') entries.push({key,value});
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [nestedKey, nestedValue] of Object.entries(value as DataRecord)) {
          if (nestedValue === null || typeof nestedValue !== 'object') entries.push({key: nestedKey, value: nestedValue});
        }
      }
    }
    return entries.slice(0, 16);
  });
  readonly storefrontStatus = computed(() => {
    const storefront = this.summary()?.['storefront'];
    return storefront && typeof storefront === 'object' ? String((storefront as DataRecord)['publication_status'] ?? '') : '';
  });
  readonly navLinks = computed(() => {
    const links = [
      { key: 'profile', label: 'Business profile', path: '/dashboard/profile' },
      { key: 'storefront', label: 'Storefront', path: '/dashboard/storefront' },
      { key: 'catalogue', label: 'Catalogue', path: '/dashboard/catalogue' },
      { key: 'members', label: 'Team & access', path: '/dashboard/members' },
      { key: 'customers', label: 'Customers', path: '/dashboard/customers' },
      { key: 'enquiries', label: 'Enquiries', path: '/dashboard/enquiries' },
      { key: 'orders', label: 'Orders', path: '/dashboard/orders' },
      { key: 'promotions', label: 'Promotions', path: '/dashboard/promotions' },
      { key: 'subscriptions', label: 'Subscriptions', path: '/dashboard/subscriptions' },
      { key: 'payments', label: 'Payments', path: '/dashboard/payments' },
      { key: 'analytics', label: 'Analytics', path: '/dashboard/analytics' },
      { key: 'platform-users', label: 'Users', path: '/dashboard/platform-users' },
      { key: 'business-approval', label: 'Business reviews', path: '/dashboard/business-approval' },
      { key: 'subscription-approval', label: 'Plan reviews', path: '/dashboard/subscription-approval' },
      { key: 'payment-qr-settings', label: 'Payment QR settings', path: '/dashboard/payment-qr-settings' },
      { key: 'moderation', label: 'Moderation', path: '/dashboard/moderation' },
      { key: 'system-health', label: 'System health', path: '/dashboard/system-health' },
      { key: 'platform-analytics', label: 'Platform analytics', path: '/dashboard/platform-analytics' },
      { key: 'categories', label: 'Categories', path: '/dashboard/categories' },
    ];
    const permissions = this.workspace.permissions();
    const has = (code: string, scope: string) => permissions.some((entry) => entry.permission_code === code && entry.scope_type === scope);
    const activeTenant = this.workspace.activeTenantId() !== null;
    const personalContext = !activeTenant && !permissions.some((entry) => entry.scope_type === 'PLATFORM');
    const tenantRequirements: Record<string,string> = {
      profile: 'BUSINESS_PROFILE_MANAGE', storefront: 'BUSINESS_PROFILE_MANAGE',
      catalogue: 'CATALOGUE_MANAGE', customers: 'CUSTOMERS_MANAGE', enquiries: 'ENQUIRIES_MANAGE',
      orders: 'ORDERS_MANAGE', promotions: 'PROMOTIONS_MANAGE', subscriptions: 'SUBSCRIPTIONS_MANAGE',
      payments: 'PAYMENTS_VIEW', analytics: 'ANALYTICS_VIEW', members: 'TENANT_MEMBERS_VIEW',
    };
    const platformRequirements: Record<string,string> = {
      'platform-users': 'PLATFORM_USERS_MANAGE', 'business-approval': 'BUSINESS_APPROVE',
      'subscription-approval': 'SUBSCRIPTIONS_APPROVE', 'payment-qr-settings': 'SUBSCRIPTIONS_APPROVE', moderation: 'MODERATION_MANAGE',
      categories: 'CATEGORIES_MANAGE', 'platform-analytics': 'ANALYTICS_VIEW', 'system-health': 'SYSTEM_HEALTH_VIEW',
    };
    return links.filter((link) => {
      if (tenantRequirements[link.key]) {
        if (activeTenant) return has(tenantRequirements[link.key], 'TENANT');
        return personalContext && ['customers','enquiries','orders','payments'].includes(link.key);
      }
      const required = platformRequirements[link.key];
      return required ? has(required, 'PLATFORM') : false;
    }).map((link) => {
      if (activeTenant) return link;
      const personalLabels: Record<string, string> = {
        customers: 'My Profile & Addresses',
        enquiries: 'My Enquiries',
        orders: 'My Orders',
        payments: 'My Payments',
      };
      return personalLabels[link.key] ? { ...link, label: personalLabels[link.key] } : link;
    });
  });

  private readonly config: Record<string, { title: string; description: string }> = {
    profile: { title: 'Business profile', description: 'Review your approved business information and account details.' },
    storefront: { title: 'Storefront', description: 'Review the public storefront information and publication status for this business.' },
    customers: { title: 'Customers', description: 'Review customer information and available customer records.' },
    enquiries: { title: 'Enquiries', description: 'Review incoming enquiries and manage sales conversations.' },
    orders: { title: 'Order management', description: 'Process, update and track orders for this business.' },
    promotions: { title: 'Promotions', description: 'Review campaigns and publish or pause eligible promotions.' },
    subscriptions: { title: 'Subscriptions & plans', description: 'Review available plans and the subscription history for this business.' },
    payments: { title: 'Payments', description: 'Review payment activity and related business records.' },
    analytics: { title: 'Analytics', description: 'Review the summary metrics available in this area.' },
    members: { title: 'Team & access', description: 'Review the members assigned to this business workspace.' },
    'platform-analytics': { title: 'Platform analytics', description: 'Review platform-wide metrics exposed to authorized administrators.' },
    categories: { title: 'Marketplace categories', description: 'Review the category taxonomy used by marketplace listings.' },
    'platform-users': { title: 'Platform users', description: 'Review platform accounts and suspend or restore eligible users.' },
    'business-approval': { title: 'Business approvals', description: 'Review pending business applications and process approval decisions.' },
    'subscription-approval': { title: 'Subscription approvals', description: 'Review pending subscription requests and process decisions.' },
    'payment-qr-settings': { title: 'Payment QR settings', description: 'Manage the UPI payment QR used for new subscription requests.' },
    moderation: { title: 'Marketplace moderation', description: 'Review reported marketplace content and record moderation decisions.' },
    'system-health': { title: 'System health', description: 'Review safe operational health information exposed to platform staff.' },
  };

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.filterSearch.set(params.get('search') ?? '');
      this.filterStatus.set(params.get('status') ?? '');
      this.filterFrom.set(params.get('from') ?? '');
      this.filterTo.set(params.get('to') ?? '');
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.section.set(params.get('section') ?? 'profile');
      this.notice.set('');
      void this.load();
    });
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.accessToken() ?? ''}` });
  }

  private async request<T = unknown>(path: string, key: EnvelopeKey, actionType: string, actionData: DataRecord = {}): Promise<T> {
    const response = await firstValueFrom(this.http.post<ApiEnvelope<T>>(`${this.apiBaseUrl}${path}`, {
      [key]: { actionType, actionData },
    }, { headers: this.headers }));
    if (response.status !== 'SUCCESS') throw new Error(response.msgArr?.join(' ') || 'The request could not be completed.');
    return response.data as T;
  }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(''); this.unsupported.set('');
    this.items.set([]); this.summary.set(null); this.plans.set([]);
    try {
      await this.workspace.initialize();
      const tenantId = this.workspace.activeTenantId();
      const pageData = { page: 1, page_size: 25, ...(tenantId ? { tenant_id: tenantId } : {}) };
      switch (this.section()) {
        case 'members': {
          if (!tenantId) return this.setUnsupported('Open Business Workspace to view team members.');
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/tenants/members/list','tenantParam','listTenantMembers',pageData);
          this.items.set(data.items ?? []); break;
        }
        case 'profile':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to view your business profile.');
          this.summary.set(await this.request<DataRecord>('/api/v1/business/profile/get','businessParam','getMyBusinessProfile',{tenant_id:tenantId}));
          break;
        case 'storefront':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to view your storefront.');
          this.summary.set(await this.request<DataRecord>('/api/v1/business/storefront/get','businessParam','getMyStorefront',{tenant_id:tenantId}));
          break;
        case 'customers':
          if (tenantId) {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/customers/tenant/list','customerParam','listTenantCustomers',pageData);
            this.items.set(data.items ?? []);
            break;
          }
          {
            const profile = await this.auth.loadProfile();
            this.summary.set(profile as unknown as DataRecord);
            try {
              const addresses = await this.request<{items?:DataRecord[]}>('/api/v1/customers/addresses/list','customerParam','listMyAddresses');
              this.items.set(addresses.items ?? []);
            } catch (addressError) {
              this.items.set([]);
              this.notice.set('Your account details loaded, but saved addresses are temporarily unavailable. ' + this.auth.errorMessage(addressError));
            }
          }
          break;
        case 'orders':
          if (tenantId) {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/orders/tenant/list','orderParam','listTenantOrders',pageData);
            this.items.set(data.items ?? []);
          } else {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/orders/list','orderParam','listMyOrders',pageData);
            this.items.set(data.items ?? []);
          }
          break;
        case 'enquiries':
          if (tenantId) {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/enquiries/tenant/list','enquiryParam','listTenantEnquiries',pageData);
            this.items.set(data.items ?? []);
          } else {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/enquiries/mine/list','enquiryParam','listMyEnquiries',{page:1,page_size:25});
            this.items.set(data.items ?? []);
          }
          break;
        case 'payments': {
          const data = tenantId
            ? await this.request<{items?:DataRecord[]}>('/api/v1/payments/tenant/list','paymentParam','listTenantPayments',pageData)
            : await this.request<{items?:DataRecord[]}>('/api/v1/payments/mine/list','paymentParam','listMyPayments',{page:1,page_size:25});
          this.items.set(data.items ?? []);
          break;
        }
        case 'promotions':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to manage promotions.');
          {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/promotions/mine/list','promotionParam','listMyPromotions',pageData);
            this.items.set(data.items ?? []);
          }
          break;
        case 'subscriptions':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to review plans and subscriptions.');
          {
            const [plans, subscriptions] = await Promise.all([
              this.request<{items?:DataRecord[]}>('/api/v1/subscriptions/plans/list','subscriptionParam','listActivePlans'),
              this.request<{items?:DataRecord[]}>('/api/v1/subscriptions/mine/list','subscriptionParam','listMySubscriptions',pageData),
            ]);
            this.plans.set(plans.items ?? []); this.items.set(subscriptions.items ?? []);
          }
          break;
        case 'analytics':
          if (tenantId) this.summary.set(await this.request<DataRecord>('/api/v1/dashboard/entrepreneur/summary','dashboardParam','getTenantSummary',{tenant_id:tenantId}));
          else return this.setUnsupported('Business analytics require Business Workspace access.');
          break;
        case 'platform-analytics':
          this.summary.set(await this.request<DataRecord>('/api/v1/admin/analytics/summary','adminParam','getAdminAnalyticsSummary'));
          break;
        case 'categories': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/categories/list','adminParam','listAdminCategories',{page:1,page_size:100});
          this.items.set(data.items ?? []); break;
        }
        case 'platform-users': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/users/list','adminParam','listPlatformUsers',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'business-approval': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/businesses/pending/list','adminParam','listPendingBusinesses',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'subscription-approval': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/subscriptions/pending/list','adminParam','listPendingSubscriptions',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'payment-qr-settings': {
          const data = await this.request<DataRecord>('/api/v1/admin/subscriptions/payment-qr/current','adminParam','getCurrentPaymentQrConfig');
          this.summary.set(data);
          this.qrPayeeName.set(String(data['payee_name'] ?? ''));
          this.qrUpiId.set(String(data['upi_id'] ?? ''));
          this.qrInstructions.set(String(data['payment_instructions'] ?? ''));
          this.qrFile.set(null);
          break;
        }
        case 'moderation': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/moderation/queue','adminParam','listModerationQueue',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'system-health':
          this.summary.set(await this.request<DataRecord>('/api/v1/admin/health/summary','adminParam','getSafeSystemHealth'));
          break;
        default:
          this.setUnsupported('This dashboard section is not configured.');
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private setUnsupported(message: string): void { this.unsupported.set(message); this.unsupportedTitle.set('Not available in this area'); this.loading.set(false); }

  readonly recordsHeading = computed(() => this.section() === 'customers' ? 'Saved addresses' : this.title());
  recordId(item: DataRecord, preferred = 'id'): number {
    const value = item[preferred] ?? item['id'] ?? item['address_id'] ?? item['category_id'] ?? item['business_id'] ?? item['subscription_id'] ?? item['promotion_id'] ?? item['order_id'] ?? item['report_id'] ?? item['user_id'];
    return Number(value ?? 0);
  }
  valueOf(item: DataRecord, keys: string[]): string { for (const key of keys) if (item[key] !== null && item[key] !== undefined && item[key] !== '') return this.formatValue(item[key]); return '—'; }
  recordTitle(item: DataRecord): string {
    return this.valueOf(item,['business_name','tenant_name','display_name','address_label','plan_name','post_title','category_name','order_number','enquiry_number','payment_reference','full_name','name','email','report_number','id']);
  }
  recordSubtitle(item: DataRecord): string {
    return this.valueOf(item,['email','business_category','category_type','customer_name','address_line_1','city','mobile','created_at','created_on','order_status','enquiry_status','subscription_status']);
  }
  statusOf(item: DataRecord): string { return String(item['approval_status'] ?? item['subscription_status'] ?? item['publication_status'] ?? item['order_status'] ?? item['enquiry_status'] ?? item['payment_status'] ?? item['report_status'] ?? item['account_status'] ?? item['customer_status'] ?? item['status'] ?? ''); }
  recordEntries(item: DataRecord): Array<{key:string;value:unknown}> {
    const hidden = new Set(['id','tenant_id','user_id','business_id','subscription_id','promotion_id','order_id','report_id','created_by','updated_by','deleted_by','password_hash','access_token','refresh_token']);
    return Object.entries(item).filter(([key,value]) => !hidden.has(key) && value !== null && typeof value !== 'object').slice(0,8).map(([key,value])=>({key,value}));
  }
  actionsFor(item: DataRecord): Array<{key:string;label:string;danger?:boolean}> {
    const status = this.statusOf(item).toUpperCase();
    if (this.section()==='orders' && this.workspace.activeTenantId()!==null && !['CANCELLED','COMPLETED','DELIVERED'].includes(status)) return [{key:'confirm-order',label:'Confirm order'},{key:'cancel-order',label:'Cancel order',danger:true}];
    if (this.section()==='enquiries' && this.workspace.activeTenantId()!==null && status!=='CLOSED') return [{key:'reply-enquiry',label:'Reply'},{key:'close-enquiry',label:'Close enquiry',danger:true}];
    if (this.section()==='promotions') return status==='PUBLISHED'
      ? [{key:'unpublish-promotion',label:'Unpublish'}]
      : [{key:'manage-post-media',label:'Manage media'},{key:'publish-promotion',label:'Publish'}];
    if (this.section()==='customers' && this.workspace.activeTenantId()===null && (item['address_id'] || item['id'])) return [{key:'default-address',label:'Set as default'},{key:'delete-address',label:'Delete address',danger:true}];
    if (this.section()==='platform-users') return status==='SUSPENDED' ? [{key:'restore-user',label:'Restore account'}] : [{key:'suspend-user',label:'Suspend account',danger:true}];
    if (this.section()==='business-approval' && status==='PENDING') return [{key:'approve-business',label:'Approve'},{key:'reject-business',label:'Reject',danger:true}];
    if (this.section()==='subscription-approval' && status==='PENDING') return [{key:'approve-subscription',label:'Approve'},{key:'reject-subscription',label:'Reject',danger:true}];
    if (this.section()==='subscriptions' && ['ACTIVE','EXPIRED'].includes(status)) return [{key:'renew-subscription',label:'Renew subscription'}];
    if (this.section()==='moderation' && status==='OPEN') return [{key:'moderate',label:'Review report'}];
    if (this.section()==='categories') return [{key:'delete-category',label:'Delete category',danger:true}];
    return [];
  }

  async runAction(action: string, item: DataRecord): Promise<void> {
    if (this.busy()) return;
    const tenantId = this.workspace.activeTenantId();
    const id = this.recordId(item);
    let path = ''; let key: EnvelopeKey = 'adminParam'; let actionType = ''; let data: DataRecord = {};
    switch (action) {
      case 'manage-post-media':
        this.addMediaToPromotion(item);
        return;
      case 'confirm-order': case 'cancel-order':
        path = action==='confirm-order'?'/api/v1/orders/tenant/confirm':'/api/v1/orders/tenant/cancel'; key='orderParam'; actionType='changeTenantOrderStatus'; data={tenant_id:tenantId,order_id:id}; break;
      case 'reply-enquiry': {
        const message = window.prompt('Write your reply to this enquiry:'); if (!message?.trim()) return;
        path='/api/v1/enquiries/tenant/respond'; key='enquiryParam'; actionType='respondToEnquiry'; data={tenant_id:tenantId,enquiry_id:id,message:message.trim()}; break;
      }
      case 'close-enquiry':
        if (!window.confirm('Close this enquiry?')) return;
        path='/api/v1/enquiries/tenant/close'; key='enquiryParam'; actionType='closeEnquiry'; data={tenant_id:tenantId,enquiry_id:id}; break;
      case 'publish-promotion': case 'unpublish-promotion':
        path=action==='publish-promotion'?'/api/v1/promotions/publish':'/api/v1/promotions/unpublish'; key='promotionParam'; actionType=action==='publish-promotion'?'publishPromotion':'unpublishPromotion'; data={tenant_id:tenantId,promotion_id:id}; break;
      case 'suspend-user': case 'restore-user':
        path=action==='suspend-user'?'/api/v1/admin/users/suspend':'/api/v1/admin/users/restore'; actionType=action==='suspend-user'?'suspendPlatformUser':'restorePlatformUser'; data={user_id:id}; break;
      case 'approve-business': case 'reject-business': {
        const reason = action==='reject-business' ? window.prompt('Reason for rejecting this application:') : null;
        if (action==='reject-business' && !reason?.trim()) return;
        path=action==='approve-business'?'/api/v1/admin/businesses/approve':'/api/v1/admin/businesses/reject'; actionType=action==='approve-business'?'approveBusiness':'rejectBusiness'; data={business_id:Number(item['business_id'] ?? item['id']),...(reason?{reason:reason.trim()}:{})}; break;
      }
      case 'renew-subscription':
        path='/api/v1/subscriptions/renewal/request'; key='subscriptionParam'; actionType='requestSubscriptionRenewal';
        data={tenant_id:tenantId,subscription_id:id}; break;
      case 'approve-subscription': case 'reject-subscription': {
        const reason = action==='reject-subscription' ? window.prompt('Reason for rejecting this subscription:') : null;
        if (action==='reject-subscription' && !reason?.trim()) return;
        let dates: DataRecord = {};
        if (action==='approve-subscription') {
          const startsOn = window.prompt('Subscription start date and time (YYYY-MM-DD HH:MM:SS):');
          const endsOn = window.prompt('Subscription end date and time (YYYY-MM-DD HH:MM:SS):');
          if (!startsOn?.trim() || !endsOn?.trim()) return;
          dates = { starts_on: startsOn.trim(), ends_on: endsOn.trim() };
        }
        path=action==='approve-subscription'?'/api/v1/admin/subscriptions/approve':'/api/v1/admin/subscriptions/reject'; actionType=action==='approve-subscription'?'approveSubscription':'rejectSubscription'; data={subscription_id:Number(item['subscription_id'] ?? item['id']),...dates,...(reason?{reason:reason.trim()}:{})}; break;
      }
      case 'default-address': case 'delete-address': {
        const remove = action==='delete-address';
        if (remove && !window.confirm('Delete this saved address?')) return;
        path=remove?'/api/v1/customers/addresses/delete':'/api/v1/customers/addresses/default'; key='customerParam'; actionType=remove?'deleteMyAddress':'setDefaultAddress'; data={address_id:Number(item['address_id'] ?? item['id'])}; break;
      }
      case 'delete-category':
        if (!window.confirm('Soft-delete this category? Categories referenced by active businesses or products cannot be deleted.')) return;
        path='/api/v1/admin/categories/delete'; actionType='deleteCategory'; data={category_id:id}; break;
      case 'moderate': {
        const contentType=String(item['content_type'] ?? '').toUpperCase();
        const actionTypeChoice=window.prompt('Enter UNPUBLISH_POST, UNPUBLISH_PRODUCT or DISMISS_REPORT:');
        if (!actionTypeChoice || !['UNPUBLISH_POST','UNPUBLISH_PRODUCT','DISMISS_REPORT'].includes(actionTypeChoice.toUpperCase())) return;
        const reason=window.prompt('Reason for this moderation decision:'); if(!reason?.trim()) return;
        path='/api/v1/admin/moderation/action'; actionType='applyModerationAction'; data={report_id:id,action_type:actionTypeChoice.toUpperCase(),reason:reason.trim()};
        if ((actionTypeChoice.toUpperCase()==='UNPUBLISH_POST' && contentType!=='POST') || (actionTypeChoice.toUpperCase()==='UNPUBLISH_PRODUCT' && contentType!=='PRODUCT')) { this.error.set('That moderation action does not match the reported content type.'); return; }
        break;
      }
      default: return;
    }
    this.busy.set(true); this.error.set('');
    try { await this.request(path,key,actionType,data); this.notice.set('The requested action was completed.'); await this.load(); }
    catch (error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async editBusinessProfile(): Promise<void> {
    const current = this.summary();
    if (!current) return;
    const businessId = Number(current['business_id'] ?? current['id'] ?? 0);
    const tenantId = this.workspace.activeTenantId();
    const businessName = window.prompt('Business name:', String(current['business_name'] ?? ''));
    if (!businessName?.trim()) return;
    const businessEmail = window.prompt('Business email:', String(current['business_email'] ?? ''));
    const businessPhone = window.prompt('Business phone:', String(current['business_phone'] ?? ''));
    const description = window.prompt('Business description:', String(current['business_description'] ?? ''));
    const address1 = window.prompt('Address line 1:', String(current['address_line_1'] ?? ''));
    const address2 = window.prompt('Address line 2:', String(current['address_line_2'] ?? ''));
    const city = window.prompt('City:', String(current['city'] ?? ''));
    const state = window.prompt('State:', String(current['state'] ?? ''));
    const postal = window.prompt('Postal code:', String(current['postal_code'] ?? ''));
    if (!tenantId || !businessId) { this.error.set('Business identifiers are unavailable. Refresh the profile before editing.'); return; }
    await this.performAction('/api/v1/business/profile/update','businessParam','updateMyBusinessProfile',{
      tenant_id:tenantId,business_id:businessId,business_name:businessName.trim(),business_email:businessEmail ?? '',
      business_phone:businessPhone ?? '',business_description:description ?? '',address_line_1:address1 ?? '',
      address_line_2:address2 ?? '',city:city ?? '',state:state ?? '',postal_code:postal ?? '',
    });
  }

  async editStorefront(): Promise<void> {
    const current = this.summary()?.['storefront'];
    if (!current || typeof current !== 'object') return;
    const settings = current as DataRecord;
    const title = window.prompt('Storefront title:', String(settings['storefront_title'] ?? ''));
    if (title === null) return;
    const description = window.prompt('Storefront description:', String(settings['storefront_description'] ?? ''));
    if (description === null) return;
    const showPrices = window.confirm('Show product prices on your storefront?');
    const acceptOrders = window.confirm('Accept online orders?');
    const whatsappEnabled = window.confirm('Enable WhatsApp contact?');
    const whatsappNumber = whatsappEnabled ? window.prompt('WhatsApp number (international format):', String(settings['whatsapp_number'] ?? '')) : '';
    const theme = window.prompt('Theme code:', String(settings['theme_code'] ?? ''));
    await this.performAction('/api/v1/business/storefront/update','businessParam','updateMyStorefront',{
      tenant_id:this.workspace.activeTenantId(),storefront_title:title,storefront_description:description,
      show_prices:showPrices,accept_online_orders:acceptOrders,whatsapp_enabled:whatsappEnabled,
      whatsapp_number:whatsappNumber ?? '',theme_code:theme ?? '',
    });
  }

  async toggleStorefront(): Promise<void> {
    const publish = this.storefrontStatus() !== 'PUBLISHED';
    if (!window.confirm(publish ? 'Publish this storefront now?' : 'Unpublish this storefront?')) return;
    await this.performAction(publish?'/api/v1/business/storefront/publish':'/api/v1/business/storefront/unpublish','businessParam',publish?'publishMyStorefront':'unpublishMyStorefront',{tenant_id:this.workspace.activeTenantId()});
  }

  addMediaToPromotion(item: DataRecord): void {
    this.draftPromotionId.set(this.recordId(item, 'id'));
    this.promotionUploadedCount.set(this.mediaOf(item).length);
    this.promotionTitle.set(String(item['post_title'] ?? ''));
    this.promotionContent.set(String(item['post_content'] ?? ''));
    this.promotionValidUntil.set(String(item['valid_until'] ?? '').replace(' ', 'T').slice(0,16));
    this.promotionFiles.set([]);
    this.promotionError.set('');
    this.showPromotionComposer.set(true);
  }

  async removePromotionAttachment(item: DataRecord, media: DataRecord): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    const promotionId = this.recordId(item, 'id');
    const mediaId = Number(media['id'] ?? 0);
    if (!tenantId || !promotionId || !mediaId || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request('/api/v1/promotions/media/delete','promotionParam','deletePromotionMedia',{
        tenant_id:tenantId,promotion_id:promotionId,media_id:mediaId,
      });
      this.notice.set('Post attachment removed.');
      await this.load();
    } catch (error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async createPromotion(): Promise<void> {
    this.draftPromotionId.set(null);
    this.promotionUploadedCount.set(0);
    this.promotionTitle.set('');
    this.promotionContent.set('');
    this.promotionValidUntil.set('');
    this.promotionFiles.set([]);
    this.promotionError.set('');
    this.showPromotionComposer.set(true);
  }

  closePromotionComposer(): void {
    if (this.promotionMediaBusy()) return;
    this.showPromotionComposer.set(false);
    this.draftPromotionId.set(null);
    this.promotionUploadedCount.set(0);
  }

  setPromotionField(field: 'title' | 'content' | 'validUntil', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (field === 'title') this.promotionTitle.set(value);
    else if (field === 'content') this.promotionContent.set(value);
    else this.promotionValidUntil.set(value);
  }

  selectPromotionMedia(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addPromotionMedia(Array.from(input.files ?? []));
    input.value = '';
  }

  allowPromotionMediaDrop(event: DragEvent): void { event.preventDefault(); }

  dropPromotionMedia(event: DragEvent): void {
    event.preventDefault();
    this.addPromotionMedia(Array.from(event.dataTransfer?.files ?? []));
  }

  private addPromotionMedia(files: File[]): void {
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg','application/pdf','text/plain','text/csv','application/rtf']);
    const invalid = files.find((file) => !allowed.has(file.type) || file.size < 1 || file.size > 100 * 1024 * 1024);
    if (invalid) this.promotionError.set(`"${invalid.name}" is not supported or exceeds the 100 MB per-file limit.`);
    else {
      this.promotionError.set('');
      this.promotionFiles.update((current) => [...current, ...files]);
    }
  }

  removePromotionMedia(index: number): void {
    this.promotionFiles.update((files) => files.filter((_, position) => position !== index));
  }

  async submitPromotion(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    if (!tenantId || !this.promotionContent().trim() || this.promotionMediaBusy()) return;
    this.promotionMediaBusy.set(true);
    this.promotionError.set('');
    try {
      let promotionId = this.draftPromotionId();
      if (!promotionId) {
        const result = await this.request<{id:number}>('/api/v1/promotions/create','promotionParam','createPromotion',{
          tenant_id:tenantId,post_title:this.promotionTitle().trim(),post_content:this.promotionContent().trim(),
          ...(this.promotionValidUntil() ? {valid_until:this.promotionValidUntil().replace('T',' ') + (this.promotionValidUntil().length === 16 ? ':00' : '')} : {}),
        });
        promotionId = Number(result.id);
        if (!promotionId) throw new Error('The draft was created but its identifier was not returned.');
        this.draftPromotionId.set(promotionId);
      } else {
        await this.request('/api/v1/promotions/update','promotionParam','updatePromotion',{
          tenant_id:tenantId,promotion_id:promotionId,post_title:this.promotionTitle().trim(),
          post_content:this.promotionContent().trim(),
          ...(this.promotionValidUntil() ? {valid_until:this.promotionValidUntil().replace('T',' ') + (this.promotionValidUntil().length === 16 ? ':00' : '')} : {}),
        });
      }
      const files = this.promotionFiles();
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const upload = await this.request<{upload_url:string;object_key:string;headers:Record<string,string>}>(
          '/api/v1/promotions/media/upload-url','promotionParam','generatePromotionMediaUploadUrl',{
            tenant_id:tenantId,promotion_id:promotionId,original_file_name:file.name,mime_type:file.type,file_size_bytes:file.size,
          },
        );
        this.promotionUploadProgress.set(0);
        await lastValueFrom(this.http.put(upload.upload_url,file,{
          headers:new HttpHeaders(upload.headers ?? {'Content-Type':file.type}),
          observe:'events',reportProgress:true,responseType:'text',
        }).pipe(
          tap((event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.promotionUploadProgress.set(Math.round((event.loaded / event.total) * 100));
            }
          }),
          filter((event) => event.type === HttpEventType.Response),
        ));
        const mediaType = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO'
          : file.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT';
        await this.request('/api/v1/promotions/media/link','promotionParam','linkPromotionMedia',{
          tenant_id:tenantId,promotion_id:promotionId,file_path:upload.object_key,mime_type:file.type,
          file_size_bytes:file.size,display_order:index,media_type:mediaType,
        });
        this.promotionFiles.update((remaining) => remaining.filter((candidate) => candidate !== file));
        this.promotionUploadedCount.update((count) => count + 1);
      }
      this.notice.set('Promotion draft and attachments saved. Publish it when ready.');
      this.showPromotionComposer.set(false);
      this.draftPromotionId.set(null);
      await this.load();
    } catch (error) {
      this.promotionError.set(this.auth.errorMessage(error));
    } finally {
      this.promotionMediaBusy.set(false);
      this.promotionUploadProgress.set(0);
    }
  }

  mediaOf(item: DataRecord): DataRecord[] {
    const media = item['media'];
    return Array.isArray(media) ? media as DataRecord[] : [];
  }
  mediaLabel(mime: string): string {
    return mime.startsWith('image/') ? 'IMAGE' : mime.startsWith('video/') ? 'VIDEO' : mime.startsWith('audio/') ? 'AUDIO' : mime === 'application/pdf' ? 'PDF' : 'DOC';
  }
  fileSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1,Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  openPasswordForm(): void {
    this.currentPassword.set(''); this.newPassword.set(''); this.confirmPassword.set('');
    this.passwordError.set(''); this.showPasswordForm.set(true);
  }

  closePasswordForm(): void {
    this.showPasswordForm.set(false); this.passwordError.set('');
    this.currentPassword.set(''); this.newPassword.set(''); this.confirmPassword.set('');
  }

  async updatePassword(): Promise<void> {
    if (this.busy()) return;
    const newPassword = this.newPassword();
    if (newPassword.length < 8) { this.passwordError.set('Use at least 8 characters for your new password.'); return; }
    if (newPassword !== this.confirmPassword()) { this.passwordError.set('The new password and confirmation do not match.'); return; }
    if (this.summary()?.['has_password'] && !this.currentPassword()) { this.passwordError.set('Enter your current password.'); return; }
    this.busy.set(true); this.passwordError.set(''); this.error.set('');
    try {
      await this.request('/api/v1/auth/password/update','authParam','setPassword',{
        ...(this.summary()?.['has_password'] ? {current_password:this.currentPassword()} : {}),
        new_password:newPassword,
      });
      this.summary.update((profile) => profile ? {...profile,has_password:true} : profile);
      this.notice.set('Your password has been saved successfully.');
      this.closePasswordForm();
    } catch (error) {
      this.passwordError.set(this.auth.errorMessage(error));
    } finally { this.busy.set(false); }
  }

  async createAddress(): Promise<void> {
    const line1 = window.prompt('Address line 1 (required):');
    if (!line1?.trim()) return;
    const recipient = window.prompt('Recipient name:');
    const mobile = window.prompt('Mobile number:');
    const city = window.prompt('City:');
    const state = window.prompt('State:');
    const postal = window.prompt('Postal code:');
    const country = window.prompt('Country code (2 letters):','IN');
    const label = window.prompt('Address label (Home, Office, etc.):','Home');
    await this.performAction('/api/v1/customers/addresses/create','customerParam','createMyAddress',{
      address_line_1:line1.trim(),recipient_name:recipient ?? '',mobile:mobile ?? '',
      city:city ?? '',state:state ?? '',postal_code:postal ?? '',country_code:(country ?? 'IN').toUpperCase(),address_label:label ?? '',
    });
  }

  async createCategory(): Promise<void> {
    const code = window.prompt('Category code (unique):');
    const name = window.prompt('Category name:');
    const type = window.prompt('Category type: BUSINESS or PRODUCT','BUSINESS');
    if (!code?.trim() || !name?.trim() || !['BUSINESS','PRODUCT'].includes((type ?? '').toUpperCase())) return;
    const description = window.prompt('Description:');
    await this.performAction('/api/v1/admin/categories/create','adminParam','createCategory',{
      category_code:code.trim().toUpperCase(),category_name:name.trim(),category_type:type!.toUpperCase(),
      description:description ?? '',display_order:0,
    });
  }

  private async performAction(path:string,key:EnvelopeKey,actionType:string,data:DataRecord):Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.request(path,key,actionType,data); this.notice.set('Changes saved successfully.'); await this.load(); }
    catch(error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  subscriptionReviewDetail(): DataRecord | null {
    const detail = this.subscriptionReview()?.['subscription'];
    return detail && typeof detail === 'object' && !Array.isArray(detail) ? detail as DataRecord : null;
  }

  subscriptionReviewProofs(): DataRecord[] {
    const proofs = this.subscriptionReview()?.['proofs'];
    return Array.isArray(proofs) ? proofs as DataRecord[] : [];
  }

  subscriptionReviewHistory(): DataRecord[] {
    const history = this.subscriptionReview()?.['review_history'];
    return Array.isArray(history) ? history as DataRecord[] : [];
  }

  async openSubscriptionReview(item: DataRecord): Promise<void> {
    const subscriptionId = this.recordId(item,'subscription_id');
    if (!subscriptionId || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const detail = await this.request<DataRecord>(
        '/api/v1/admin/subscriptions/detail','adminParam','getSubscriptionForReview',{subscription_id:subscriptionId},
      );
      this.subscriptionReview.set(detail);
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  setPaymentQrFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)) {
      this.error.set('Choose a JPG, PNG or WEBP image up to 10 MB.');
      this.qrFile.set(null);
    } else {
      this.error.set('');
      this.qrFile.set(file);
    }
    input.value = '';
  }

  async savePaymentQrConfig(): Promise<void> {
    const file = this.qrFile();
    if (!file || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const upload = await this.request<{upload_url:string;object_key:string;headers:Record<string,string>}>(
        '/api/v1/admin/subscriptions/payment-qr/upload-url','adminParam','generatePaymentQrUploadUrl',{
          original_file_name:file.name,mime_type:file.type,file_size_bytes:file.size,
        },
      );
      await firstValueFrom(this.http.put(upload.upload_url,file,{
        headers:new HttpHeaders(upload.headers ?? {'Content-Type':file.type}),responseType:'text',
      }));
      await this.request('/api/v1/admin/subscriptions/payment-qr/save','adminParam','savePaymentQrConfig',{
        payee_name:this.qrPayeeName().trim(),upi_id:this.qrUpiId().trim(),
        payment_instructions:this.qrInstructions().trim(),qr_file_path:upload.object_key,
      });
      this.notice.set('A new payment QR configuration is active for new subscription requests.');
      this.qrFile.set(null);
      await this.load();
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async uploadProof(event: Event, subscription: DataRecord): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
      this.error.set('Choose a non-empty JPG, PNG, WEBP or PDF file up to 10 MB.');
      input.value = '';
      return;
    }
    const subscriptionId = this.recordId(subscription,'subscription_id');
    const tenantId = this.workspace.activeTenantId();
    if (!subscriptionId || !tenantId) { this.error.set('Subscription or workspace details are unavailable.'); input.value=''; return; }
    const paymentReference = window.prompt('Payment reference (optional):') ?? '';
    this.busy.set(true); this.error.set('');
    try {
      const upload = await this.request<{upload_url:string;object_key:string;method:string;headers:Record<string,string>}>(
        '/api/v1/subscriptions/proofs/upload-url','subscriptionParam','generateSubscriptionProofUploadUrl',{
          tenant_id:tenantId,subscription_id:subscriptionId,original_file_name:file.name,mime_type:file.type,file_size_bytes:file.size,
        },
      );
      await firstValueFrom(this.http.put(upload.upload_url,file,{
        headers:new HttpHeaders(upload.headers ?? {'Content-Type':file.type}),responseType:'text',
      }));
      this.proofDrafts.update((drafts) => ({...drafts,[subscriptionId]:{
        objectKey:upload.object_key,paymentReference:paymentReference.trim(),fileName:file.name,
      }}));
      this.notice.set('Receipt uploaded. Select “Submit for Review” when you are ready to send it to the BBG team.');
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  async submitProof(subscription: DataRecord): Promise<void> {
    const subscriptionId = this.recordId(subscription,'subscription_id');
    const tenantId = this.workspace.activeTenantId();
    const draft = this.proofDrafts()[subscriptionId];
    if (!subscriptionId || !tenantId || !draft || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.request('/api/v1/subscriptions/proofs/submit','subscriptionParam','submitSubscriptionProof',{
        tenant_id:tenantId,subscription_id:subscriptionId,proof_file_path:draft.objectKey,
        ...(draft.paymentReference ? {payment_reference:draft.paymentReference} : {}),
      });
      this.proofDrafts.update((drafts) => {
        const next = {...drafts};
        delete next[subscriptionId];
        return next;
      });
      this.notice.set('Payment proof submitted for review.');
      await this.load();
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async requestPlan(plan: DataRecord): Promise<void> {
    const planId=this.recordId(plan,'plan_id'); if (!planId || this.busy()) return;
    this.pendingPlanId.set(planId); this.busy.set(true); this.error.set('');
    try {
      await this.request('/api/v1/subscriptions/request','subscriptionParam','requestSubscription',{tenant_id:this.workspace.activeTenantId(),plan_id:planId});
      this.notice.set('Your subscription request has been submitted.'); await this.load();
    } catch(error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.pendingPlanId.set(null); this.busy.set(false); }
  }

  humanize(value: string): string { return value.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,(letter)=>letter.toUpperCase()); }
  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && /^\d{4}-\d\d-\d\d/.test(value)) return new Date(value).toLocaleString();
    return String(value);
  }
  statusClass(status: string): string {
    const value=status.toUpperCase();
    if (['ACTIVE','APPROVED','PUBLISHED','CONFIRMED','RESPONDED','PAID','RESOLVED'].includes(value)) return 'status-chip good';
    if (['PENDING','DRAFT','PROCESSING','OPEN'].includes(value)) return 'status-chip warn';
    if (['REJECTED','CANCELLED','SUSPENDED','FAILED','DISMISSED'].includes(value)) return 'status-chip bad';
    return 'status-chip';
  }
}

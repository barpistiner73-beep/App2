const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Workout Rest Guidance and Time-Crunch Protocol updates...');

// 1. Verify index.html & public/index.html
['index.html', 'public/index.html'].forEach(file => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

  // Rest guidance text
  assert(content.includes('מומלץ לנוח עד מצב התאוששות מוחלטת'), `${file} must include rest recovery advice`);
  assert(content.includes('דקה ומתחת ל־6 דקות'), `${file} must include 1 to under 6 min advice`);
  assert(content.includes('כדי לא לאבד את החימום של השריר'), `${file} must mention muscle warmup`);

  // Time-crunch protocol sections
  assert(content.includes('עקרון הבסיס'), `${file} must include core principle`);
  assert(content.includes('לדאוג שכל קבוצת שריר מקבלת לפחות סט איכותי 1'), `${file} must include at least 1 quality set rule`);
  assert(content.includes('דוגמה ליישום (למשל ביום Push)'), `${file} must include push day example`);
  assert(content.includes('חזה') && content.includes('כתפיים') && content.includes('יד אחורית'), `${file} must include order chest, shoulders, triceps`);
  assert(content.includes('לפחות 2 סטים מכל דבר'), `${file} must include at least 2 sets rule`);
  assert(content.includes('שלב ההשלמה (אם נשאר זמן)'), `${file} must include completion phase`);
  assert(content.includes('תרחיש קיצון (אם אין בכלל זמן)'), `${file} must include extreme crunch scenario`);

  console.log(`✅ ${file} passed all verification checks.`);
});

// 2. Verify app.js & public/app.js
['app.js', 'public/app.js'].forEach(file => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  assert(content.includes('function getTimeCrunchBannerHTML()'), `${file} must define getTimeCrunchBannerHTML`);
  assert(content.includes('לדאוג שכל קבוצת שריר מקבלת לפחות סט איכותי 1'), `${file} must include protocol text`);
  assert(content.includes('banner.innerHTML = getTimeCrunchBannerHTML()'), `${file} must inject rich banner on toggle`);
  console.log(`✅ ${file} passed all function and protocol checks.`);
});

// 3. Verify style.css & public/style.css
['style.css', 'public/style.css'].forEach(file => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  assert(content.includes('.time-crunch-banner'), `${file} must style .time-crunch-banner`);
  assert(content.includes('.workout-rest-advisory-card'), `${file} must style .workout-rest-advisory-card`);
  assert(content.includes('.session-rest-recovery-note'), `${file} must style .session-rest-recovery-note`);
  console.log(`✅ ${file} passed all CSS checks.`);
});

console.log('🎉 ALL TIME-CRUNCH & REST GUIDANCE CHECKS PASSED PERFECTLY!');

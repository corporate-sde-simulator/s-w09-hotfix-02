// ============================================================
// HOTFIX — DEVTOOLS-111: Flaky Test Blocking CI Pipeline
// Priority: P1 | SLA: 30 minutes | Reporter: CI Bot
// ============================================================
//
// This test passes locally but fails in CI ~40% of the time.
// The issue is timing-dependent: it uses setTimeout with exact
// timing assertions, which is unreliable in slow CI environments.
//
// 1. Replace exact timing check with a tolerance-based check
// 2. Use fake timers instead of real timers
//
// but CI servers are slower and it takes 110-150ms.
// ============================================================

const { performance } = require('perf_hooks');

class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    tryRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.windowMs);
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        this.requests.push(now);
        return true;
    }
}

// ─── TEST (this is the flaky part) ───

function runTest() {
    const limiter = new RateLimiter(2, 100);

    console.assert(limiter.tryRequest() === true, 'First request should pass');
    console.assert(limiter.tryRequest() === true, 'Second request should pass');
    console.assert(limiter.tryRequest() === false, 'Third request should be blocked');

    // In CI, the callback may fire at 110-150ms, causing the window
    // check to still include old requests.
    setTimeout(() => {
        const result = limiter.tryRequest();
        console.assert(result === true, 'Request after window should pass');
        console.log(result ? 'PASS: All tests passed' : 'FAIL: Timing issue');
    }, 100);
}

runTest();

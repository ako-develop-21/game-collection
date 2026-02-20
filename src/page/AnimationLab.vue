<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
    <div class="lab-container">
        <div class="lab-header">
            <button class="back-btn" @click="router.push('/')">
                ← BACK TO HOME
            </button>
            <h1 class="lab-title">ANIMATION LABORATORY</h1>
            <p class="lab-subtitle">
                Mastering the art of CSS motion through practice.
            </p>
        </div>

        <div class="lab-grid">
            <!-- Hover Section -->
            <section class="lab-section">
                <h2 class="section-title">01. Premium Hover States</h2>
                <div class="demo-box">
                    <div class="card basic-hover">
                        <span>SCALE & SHADOW</span>
                        <p>Smooth transition using cubic-bezier</p>
                    </div>
                    <div class="card glass-hover">
                        <span>GLASS REFLECTION</span>
                        <p>Pseudo-element highlight effect</p>
                    </div>
                    <div class="card border-draw">
                        <span>BORDER DRAW</span>
                        <p>Animating border length</p>
                    </div>
                </div>
            </section>

            <!-- Keyframes Section -->
            <section class="lab-section">
                <h2 class="section-title">02. Keyframe Master</h2>
                <div class="demo-box">
                    <div class="card float-anim">
                        <span class="icon">🛸</span>
                        <span>FLOATING</span>
                    </div>
                    <div class="card pulse-anim">
                        <span class="icon">❤️</span>
                        <span>PULSING</span>
                    </div>
                    <div class="card shake-anim">
                        <span class="icon">🔔</span>
                        <span>SHAKING</span>
                    </div>
                </div>
            </section>

            <!-- Complex Easing Section -->
            <section class="lab-section full-width">
                <h2 class="section-title">03. Cubic-Bezier & Timing</h2>
                <div class="easing-playground">
                    <div class="easing-item">
                        <div class="ball ease-in"></div>
                        <span>ease-in</span>
                    </div>
                    <div class="easing-item">
                        <div class="ball ease-out"></div>
                        <span>ease-out</span>
                    </div>
                    <div class="easing-item">
                        <div class="ball custom-spring"></div>
                        <span>custom spring</span>
                    </div>
                </div>
            </section>

            <!-- Free Section -->
            <section class="lab-section">
                <h2 class="section-title">04. Custom Animation Practice</h2>
                <div class="demo-box">
                    <div class="card ring-bell-anim">
                        <div class="waves">
                            <div class="wave"></div>
                            <div class="wave"></div>
                            <div class="wave"></div>
                        </div>
                        <span class="icon">🔔</span>
                        <span>RING BELL</span>
                        <p>2s Loop: 2x Shake + 1x Float + Waves</p>
                    </div>
                    <div class="card shooting-star-anim">
                        <div class="star-trail"></div>
                        <span class="icon">⭐</span>
                        <span>SHOOTING STAR</span>
                        <p>1.5s Loop: Top-Right to Bottom-Left</p>
                    </div>
                    <div class="card spin-anim">
                        <span class="icon">🔄</span>
                        <span>SPIN</span>
                        <p>1.5s Loop: 360deg</p>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<style scoped lang="scss">
.lab-container {
    min-height: 100vh;
    background: #0f172a; // Slate-900
    color: #f8fafc;
    padding: 4rem 2rem;
    font-family: "Inter", sans-serif;
}

.lab-header {
    max-width: 1200px;
    margin: 0 auto 4rem;
    text-align: center;
    animation: slideDown 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.back-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    margin-bottom: 2rem;
    transition: all 0.3s;
    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        transform: translateX(-5px);
    }
}

.lab-title {
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.05em;
    background: linear-gradient(to right, #60a5fa, #a855f7);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 1rem;
}

.lab-subtitle {
    color: #94a3b8;
    font-size: 1.2rem;
}

.lab-grid {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 3rem;
}

.lab-section {
    &.full-width {
        grid-column: 1 / -1;
    }
}

.section-title {
    font-size: 1.1rem;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin-bottom: 1.5rem;
    border-left: 4px solid #6366f1;
    padding-left: 1rem;
}

.demo-box {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
}

.card {
    height: 180px;
    background: #1e293b;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
    cursor: pointer;

    span {
        font-size: 0.9rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    p {
        font-size: 0.75rem;
        color: #64748b;
    }
    .icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
    }
}

/* 01. Hover Demos */
.basic-hover {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    &:hover {
        transform: translateY(-10px) scale(1.05);
        background: #334155;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    }
}

.glass-hover {
    &::before {
        content: "";
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
            45deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
        );
        transform: rotate(45deg) translateY(100%);
        transition: transform 0.6s;
    }
    &:hover::before {
        transform: rotate(45deg) translateY(-100%);
    }
}

.border-draw {
    &::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 2px solid #60a5fa;
        border-radius: 20px;
        clip-path: inset(0 100% 100% 0);
        transition: clip-path 0.5s;
    }
    &:hover::after {
        clip-path: inset(0 0 0 0);
    }
}

/* 02. Keyframe Demos */
.float-anim {
    &:hover .icon {
        animation: float 2s ease-in-out infinite;
    }
}
.pulse-anim {
    &:hover .icon {
        animation: pulse 1s ease-in-out infinite;
    }
}
.shake-anim {
    &:hover .icon {
        animation: shake 0.5s ease-in-out infinite;
    }
}

@keyframes float {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-15px);
    }
}
@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.3);
    }
}
@keyframes shake {
    0%,
    100% {
        transform: rotate(0);
    }
    25% {
        transform: rotate(-10deg);
    }
    75% {
        transform: rotate(10deg);
    }
}

/* 03. Easing Playground */
.easing-playground {
    background: rgba(255, 255, 255, 0.02);
    padding: 3rem;
    border-radius: 30px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}
.easing-item {
    display: flex;
    align-items: center;
    gap: 2rem;
    span {
        color: #64748b;
        font-family: monospace;
    }
}
.ball {
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.easing-playground:hover .ball {
    transform: translateX(calc(1200px - 200px));
}

.ease-in {
    transition: transform 2s ease-in;
}
.ease-out {
    transition: transform 2s ease-out;
}
.custom-spring {
    transition: transform 2s cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 768px) {
    .lab-grid {
        grid-template-columns: 1fr;
    }
    .lab-title {
        font-size: 2.5rem;
    }
}

/** 04. Custom Animation */
.ring-bell-anim {
    position: relative;

    .waves {
        position: absolute;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        pointer-events: none;
    }

    .wave {
        position: absolute;
        inset: 0;
        border: 2px solid #f1c40f;
        border-radius: 50%;
        opacity: 0;
    }

    &:hover {
        .icon {
            animation: ringBellComplex 2s ease-in-out infinite;
            will-change: transform;
        }

        .wave {
            animation: soundWave 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)
                infinite;
            &:nth-child(2) {
                animation-delay: 0.4s;
            }
            &:nth-child(3) {
                animation-delay: 0.8s;
            }
        }
    }
}

@keyframes ringBellComplex {
    /* Smoother transition: 2 cycles of shake + 1 cycle of float over 2s */
    0% {
        transform: rotate(0deg) translateY(0);
    }
    10% {
        transform: rotate(-25deg) translateY(-4px);
    }
    20% {
        transform: rotate(20deg) translateY(-8px);
    }
    30% {
        transform: rotate(-25deg) translateY(-12px);
    }
    40% {
        transform: rotate(20deg) translateY(-16px);
    }
    50% {
        transform: rotate(0deg) translateY(-20px);
    }
    60% {
        transform: rotate(-25deg) translateY(-16px);
    }
    70% {
        transform: rotate(20deg) translateY(-12px);
    }
    80% {
        transform: rotate(-25deg) translateY(-8px);
    }
    90% {
        transform: rotate(20deg) translateY(-4px);
    }
    100% {
        transform: rotate(0deg) translateY(0);
    }
}

@keyframes soundWave {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }
    10% {
        opacity: 0.8;
    }
    100% {
        transform: scale(2.5);
        opacity: 0;
    }
}

.shooting-star-anim {
    position: relative;
    overflow: hidden;

    .star-trail {
        position: absolute;
        top: 0px;
        right: 0;
        width: 100px;
        height: 2px;
        background: linear-gradient(to right, transparent, #f1c40f);
        transform: rotate(-135deg) translateX(100%);
        opacity: 0;
        pointer-events: none;
    }

    &:hover {
        .icon {
            animation: shootStar 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
            will-change: transform;
        }
        .star-trail {
            animation: shootTrail 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }
    }
}

@keyframes shootStar {
    0% {
        transform: translate(100px, -100px) scale(0);
        opacity: 0;
    }
    20% {
        transform: translate(80px, -80px) scale(1.2);
        opacity: 1;
    }
    80% {
        transform: translate(-80px, 80px) scale(0.8);
        opacity: 1;
    }
    100% {
        transform: translate(-150px, 150px) scale(0);
        opacity: 0;
    }
}

@keyframes shootTrail {
    0% {
        transform: translate(100px, -100px) rotate(135deg) scaleX(0);
        opacity: 0;
    }
    20% {
        opacity: 1;
    }
    80% {
        opacity: 1;
    }
    100% {
        transform: translate(-150px, 150px) rotate(135deg) scaleX(2);
        opacity: 0;
    }
}

.spin-anim {
    position: relative;
    overflow: hidden;

    &:hover {
        .icon {
            animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
            will-change: transform;
        }
    }
}

@keyframes spin {
    0% {
        transform: rotate(-720deg) scale(1);
        opacity: 1;
    }
    10% {
        transform: rotate(-730deg) scale(1.2);
        opacity: 1;
    }
    90% {
        transform: rotate(730deg) scale(0.8);
        opacity: 1;
    }
    100% {
        transform: rotate(720deg) scale(1);
        opacity: 1;
    }
}
</style>

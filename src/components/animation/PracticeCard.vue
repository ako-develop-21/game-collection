<script setup lang="ts">
defineProps<{
  id: string
  title: string
  target: string
}>()
</script>

<template>
  <div class="practice-card">
    <div class="practice-stage">
      <slot></slot>
    </div>
    <div class="practice-info">
      <span class="challenge-id">CHALLENGE {{ id }}</span>
      <h3>{{ title }}</h3>
      <p>Target: {{ target }}</p>
      <div class="status-badge">READY</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.practice-card {
  background: #1e293b;
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: #6366f1;
    transform: translateY(-5px);
    background: #242f44;
  }
}

.practice-stage {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.challenge-id {
  font-size: 0.7rem;
  font-weight: 800;
  color: #6366f1;
  letter-spacing: 0.1em;
}

.practice-info {
  text-align: left;
  
  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0.25rem 0;
    color: #f8fafc;
  }
  
  p {
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 0.75rem;
  }
}

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
}
</style>

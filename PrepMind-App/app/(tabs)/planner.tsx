/**
 * Study Planner — Phase 7
 *
 * AI generates a personalized 7-day study plan based on:
 *   - User's weak topics (from MCQ history)
 *   - Hours available per day
 *   - Optional exam date
 *
 * UI: Day tabs (Mon–Sun) with task cards for each time slot
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, TextInput,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type Task = {
  time: string;
  subject: string;
  task: string;
  duration_mins: number;
  type: string;
};

type DayPlan = {
  day: string;
  tasks: Task[];
  total_hours: number;
  focus_topic: string;
};

type StudyPlan = {
  week_goal: string;
  days: DayPlan[];
};

type PlannerState = 'setup' | 'loading' | 'plan';

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  study:          { bg: '#3b82f615', text: '#3b82f6', icon: '📖' },
  revision:       { bg: '#8b5cf615', text: '#8b5cf6', icon: '🔄' },
  practice:       { bg: '#f59e0b15', text: '#f59e0b', icon: '✏️' },
  mock_test:      { bg: '#ef444415', text: '#ef4444', icon: '📝' },
  current_affairs:{ bg: '#22c55e15', text: '#22c55e', icon: '📰' },
  rest:           { bg: '#6b728015', text: '#6b7280', icon: '😴' },
};

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlannerScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id || 'anonymous';

  const [state, setState] = useState<PlannerState>('setup');
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [examDate, setExamDate] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [error, setError] = useState('');

  // Load existing plan on mount
  useEffect(() => {
    loadExistingPlan();
  }, []);

  async function loadExistingPlan() {
    try {
      const res = await fetch(`${BASE_URL}/api/planner/latest?user_id=${userId}`);
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
        setState('plan');
      }
    } catch {
      // No existing plan — show setup
    }
  }

  async function generatePlan() {
    setState('loading');
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          hours_per_day: hoursPerDay,
          exam_date: examDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate plan');
      setPlan(data.plan);
      setSelectedDay(0);
      setState('plan');
    } catch (e: any) {
      setError(e.message);
      setState('setup');
    }
  }

  if (state === 'loading') {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingTitle}>AI is building your plan...</Text>
        <Text style={styles.loadingSubtitle}>Analyzing weak areas & creating your schedule</Text>
      </View>
    );
  }

  if (state === 'plan' && plan) {
    const currentDay = plan.days?.[selectedDay];
    return (
      <SafeAreaView style={styles.safe}>
        {/* Week goal banner */}
        <View style={styles.goalBanner}>
          <Text style={styles.goalIcon}>🎯</Text>
          <Text style={styles.goalText} numberOfLines={2}>{plan.week_goal}</Text>
        </View>

        {/* Day tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8 }}>
          {plan.days?.map((day, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayTabText, selectedDay === i && styles.dayTabTextActive]}>
                {DAY_ABBR[i] || day.day.slice(0, 3)}
              </Text>
              <Text style={[styles.dayTabHours, selectedDay === i && { color: '#fff' }]}>
                {day.total_hours}h
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Day content */}
        {currentDay ? (
          <ScrollView style={styles.taskScroll} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
            {/* Day header */}
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{currentDay.day}</Text>
              <View style={styles.focusBadge}>
                <Text style={styles.focusBadgeText}>Focus: {currentDay.focus_topic}</Text>
              </View>
            </View>

            {/* Tasks */}
            {currentDay.tasks?.map((task, i) => {
              const style = TYPE_COLORS[task.type] || TYPE_COLORS.study;
              return (
                <View key={i} style={[styles.taskCard, { borderColor: style.text + '30' }]}>
                  <View style={[styles.taskTypePill, { backgroundColor: style.bg }]}>
                    <Text style={[styles.taskTypeText, { color: style.text }]}>{style.icon} {task.type.replace('_', ' ')}</Text>
                  </View>
                  <View style={styles.taskBody}>
                    <View style={styles.taskTop}>
                      <Text style={styles.taskTime}>{task.time}</Text>
                      <Text style={styles.taskDuration}>{task.duration_mins} min</Text>
                    </View>
                    <Text style={styles.taskSubject}>{task.subject}</Text>
                    <Text style={styles.taskDesc}>{task.task}</Text>
                  </View>
                </View>
              );
            })}

            {/* Regenerate button */}
            <TouchableOpacity style={styles.regenerateBtn} onPress={() => setState('setup')}>
              <Text style={styles.regenerateBtnText}>⟳ Regenerate Plan</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <Text style={{ padding: 20, color: Colors.outline }}>No tasks for this day</Text>
        )}
      </SafeAreaView>
    );
  }

  // Setup screen
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Study Planner</Text>
          <Text style={styles.subtitle}>AI creates a personalized 7-day schedule based on your weak areas</Text>
        </View>

        {error !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Hours per day */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Hours available per day</Text>
          <View style={styles.hoursRow}>
            {[2, 3, 4, 5, 6, 8].map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.hoursBtn, hoursPerDay === h && styles.hoursBtnActive]}
                onPress={() => setHoursPerDay(h)}
              >
                <Text style={[styles.hoursBtnText, hoursPerDay === h && styles.hoursBtnTextActive]}>{h}h</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exam date */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Exam date (optional)</Text>
          <TextInput
            style={styles.input}
            value={examDate}
            onChangeText={setExamDate}
            placeholder="e.g. 2025-06-15"
            placeholderTextColor={Colors.outline}
          />
          <Text style={styles.inputHint}>Leave empty for general preparation</Text>
        </View>

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          {[
            'AI checks your MCQ history for weak topics',
            'Generates a realistic 7-day schedule',
            'Prioritizes your weakest subjects',
            'Includes study, revision & mock tests',
          ].map((item, i) => (
            <Text key={i} style={styles.howItem}>
              <Text style={{ color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold' }}>{i + 1}. </Text>
              {item}
            </Text>
          ))}
        </View>

        <TouchableOpacity style={styles.generateBtn} onPress={generatePlan} activeOpacity={0.85}>
          <Text style={styles.generateBtnText}>Generate My Plan ✨</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.md, paddingBottom: 40 },

  header: { marginBottom: Spacing.lg },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: Colors.onSurface },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 },

  loadingTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: Colors.onSurface, marginTop: 20 },
  loadingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 6 },

  errorCard: {
    backgroundColor: Colors.error + '10', borderRadius: Radius.lg,
    padding: Spacing.sm, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.error + '30',
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.error },

  formSection: { marginBottom: Spacing.lg },
  formLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: Colors.onSurface, marginBottom: 10 },
  hoursRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hoursBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  hoursBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  hoursBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.onSurfaceVariant },
  hoursBtnTextActive: { color: '#fff' },

  input: {
    borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: Radius.lg,
    padding: 12, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurface,
    backgroundColor: Colors.surfaceBright,
  },
  inputHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.outline, marginTop: 4 },

  howCard: {
    backgroundColor: Colors.primary + '08', borderRadius: Radius.xl, padding: Spacing.md,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '20',
  },
  howTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: Colors.onSurface, marginBottom: 8 },
  howItem: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 24 },

  generateBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  generateBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#fff' },

  // Plan view
  goalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primary + '10', padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  goalIcon: { fontSize: 20 },
  goalText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.onSurface, flex: 1, lineHeight: 20 },

  dayTabs: { maxHeight: 72, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  dayTab: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  dayTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayTabText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: Colors.onSurfaceVariant },
  dayTabTextActive: { color: '#fff' },
  dayTabHours: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.outline },

  taskScroll: { flex: 1 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  dayTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: Colors.onSurface },
  focusBadge: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  focusBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.primary },

  taskCard: {
    borderRadius: Radius.xl, borderWidth: 1,
    overflow: 'hidden', marginBottom: 10,
    backgroundColor: Colors.surfaceContainerLowest ?? Colors.surface,
  },
  taskTypePill: { paddingHorizontal: 14, paddingVertical: 6 },
  taskTypeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'capitalize' },
  taskBody: { padding: Spacing.md },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  taskTime: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.onSurfaceVariant },
  taskDuration: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.outline },
  taskSubject: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: Colors.onSurface, marginBottom: 2 },
  taskDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 18 },

  regenerateBtn: {
    marginTop: Spacing.lg, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center',
  },
  regenerateBtnText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.onSurfaceVariant },
});

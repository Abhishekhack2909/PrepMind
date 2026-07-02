import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
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

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CATEGORY_ACCENTS: Record<string, string> = {
  study: Colors.primary,
  practice: Colors.accent,
  mock_test: Colors.accent,
  revision: Colors.warning,
  current_affairs: Colors.warning,
};

export default function PlannerScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id || 'anonymous';

  const [state, setState] = useState<PlannerState>('setup');
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [examDate, setExamDate] = useState('2026-06-15');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [error, setError] = useState('');

  // Local state for focus topics (simulated bento focus tags matching design)
  const [focusTopics, setFocusTopics] = useState<string[]>(['Ancient History', 'Polity']);

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
      // Show setup by default
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

  function addTopicPrompt() {
    Alert.alert('Add Focus Area', 'Enter a topic to focus on:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add',
        onPress: (text?: string) => {
          if (text && text.trim()) {
            setFocusTopics([...focusTopics, text.trim()]);
          }
        }
      }
    ], 'plain-text');
  }


  function removeTopic(index: number) {
    setFocusTopics(focusTopics.filter((_, i) => i !== index));
  }

  if (state === 'loading') {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.loadingIconContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
        <Text style={styles.loadingTitle}>AI is building your plan...</Text>
        <Text style={styles.loadingSubtitle}>Analyzing weak areas & creating your schedule</Text>
      </View>
    );
  }

  if (state === 'plan' && plan) {
    const currentDay = plan.days?.[selectedDay];
    
    // Group tasks under categories for Daily Plan view
    const readTasks = currentDay?.tasks?.filter(t => t.type === 'study') || [];
    const practiceTasks = currentDay?.tasks?.filter(t => t.type === 'practice' || t.type === 'mock_test') || [];
    const reviseTasks = currentDay?.tasks?.filter(t => t.type === 'revision' || t.type === 'current_affairs') || [];
    const otherTasks = currentDay?.tasks?.filter(t => t.type !== 'study' && t.type !== 'practice' && t.type !== 'mock_test' && t.type !== 'revision' && t.type !== 'current_affairs') || [];

    return (
      <SafeAreaView style={styles.safe}>
        {/* Mobile Header */}
        <View style={styles.planHeader}>
          <View style={styles.planHeaderLeft}>
            <Text style={styles.planHeaderIcon}>📖</Text>
            <Text style={styles.planHeaderTitle}>Study Planner</Text>
          </View>
          <TouchableOpacity style={styles.statsBtn} activeOpacity={0.7} onPress={() => setState('setup')}>
            <Text style={styles.statsBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.taskScroll} showsVerticalScrollIndicator={false}>
          
          {/* Day selection tabs */}
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
                <Text style={[styles.dayTabHours, selectedDay === i && { color: 'rgba(255,255,255,0.8)' }]}>
                  {day.total_hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Progress Overview Section */}
          <View style={styles.progressCard}>
            <View style={styles.circleProgressWrapper}>
              <View style={styles.circleProgressPlaceholder} />
              <View style={styles.circleTextContainer}>
                <Text style={styles.circlePercentage}>65%</Text>
                <Text style={styles.circleLabel}>DONE</Text>
              </View>
            </View>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressTitle}>Great pace today!</Text>
              <Text style={styles.progressSubtitle}>You are on track to finish your daily targets. Keep pushing forward.</Text>
              <View style={styles.progressBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.progressBadgeText}>4/6 Tasks done</Text>
              </View>
            </View>
          </View>

          {/* Task List Timeline Section */}
          {currentDay ? (
            <View style={styles.taskListBento}>
              
              {/* Category: Read */}
              {readTasks.length > 0 && (
                <View style={styles.taskCategory}>
                  <Text style={styles.categoryTitle}>📖  READ</Text>
                  {readTasks.map((task, i) => (
                    <View key={i} style={styles.taskRow}>
                      <View style={[styles.taskAccentBar, { backgroundColor: Colors.primary }]} />
                      <TouchableOpacity style={[styles.checkBtn, styles.checkBtnChecked]} activeOpacity={0.7}>
                        <Text style={styles.checkIcon}>✓</Text>
                      </TouchableOpacity>
                      <View style={styles.taskRowInfo}>
                        <Text style={[styles.taskRowSubject, styles.textLineThrough]}>{task.subject}</Text>
                        <Text style={styles.taskRowDesc}>{task.task}</Text>
                      </View>
                      <View style={styles.durationBadge}>
                        <Text style={styles.taskRowTime}>{task.duration_mins}m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Category: Practice */}
              {practiceTasks.length > 0 && (
                <View style={styles.taskCategory}>
                  <Text style={styles.categoryTitle}>🎯  PRACTICE</Text>
                  {practiceTasks.map((task, i) => (
                    <View key={i} style={styles.taskRowActive}>
                      <View style={[styles.taskAccentBarActive, { backgroundColor: Colors.accent }]} />
                      <View style={styles.activeInnerRow}>
                        <TouchableOpacity style={styles.checkBtn} activeOpacity={0.7} />
                        <View style={styles.taskRowInfo}>
                          <Text style={styles.taskRowSubject}>{task.subject}</Text>
                          <Text style={styles.taskRowDesc}>{task.task}</Text>
                        </View>
                        <View style={styles.activeAction}>
                          <View style={styles.durationBadge}>
                            <Text style={styles.taskRowTime}>{task.duration_mins}m</Text>
                          </View>
                          <TouchableOpacity style={styles.startBtnSmall} activeOpacity={0.8}>
                            <Text style={styles.startBtnSmallText}>Start</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Category: Revise */}
              {reviseTasks.length > 0 && (
                <View style={styles.taskCategory}>
                  <Text style={styles.categoryTitle}>📝  REVISE</Text>
                  {reviseTasks.map((task, i) => (
                    <View key={i} style={styles.taskRow}>
                      <View style={[styles.taskAccentBar, { backgroundColor: Colors.warning }]} />
                      <TouchableOpacity style={styles.checkBtn} activeOpacity={0.7} />
                      <View style={styles.taskRowInfo}>
                        <Text style={styles.taskRowSubject}>{task.subject}</Text>
                        <Text style={styles.taskRowDesc}>{task.task}</Text>
                      </View>
                      <View style={styles.durationBadge}>
                        <Text style={styles.taskRowTime}>{task.duration_mins}m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Category: Others */}
              {otherTasks.length > 0 && (
                <View style={styles.taskCategory}>
                  <Text style={styles.categoryTitle}>⏰  OTHERS</Text>
                  {otherTasks.map((task, i) => (
                    <View key={i} style={styles.taskRow}>
                      <View style={[styles.taskAccentBar, { backgroundColor: Colors.onSurfaceMuted }]} />
                      <TouchableOpacity style={styles.checkBtn} activeOpacity={0.7} />
                      <View style={styles.taskRowInfo}>
                        <Text style={styles.taskRowSubject}>{task.subject}</Text>
                        <Text style={styles.taskRowDesc}>{task.task}</Text>
                      </View>
                      <View style={styles.durationBadge}>
                        <Text style={styles.taskRowTime}>{task.duration_mins}m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

            </View>
          ) : (
            <Text style={styles.noTasks}>No tasks planned for today</Text>
          )}

          {/* APJ Kalam Quote Card — gradient dark card */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteIcon}>"</Text>
            <Text style={styles.quoteText}>
              "You have to dream before your dreams can come true."
            </Text>
            <Text style={styles.quoteAuthor}>- A.P.J. ABDUL KALAM</Text>
          </View>

          {/* Reset/Regenerate trigger */}
          <TouchableOpacity style={styles.regenerateBtn} onPress={() => setState('setup')} activeOpacity={0.7}>
            <Text style={styles.regenerateBtnText}>⟳ Configure Plan Parameters</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Setup / Parameters screen (study_planner.html)
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Study Planner</Text>
          <Text style={styles.subtitle}>AI creates a personalized 7-day schedule based on your weak areas</Text>
        </View>

        {error !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Bento Grid Parameter Cards */}
        <View style={styles.setupGrid}>
          
          {/* Exam Date Card */}
          <View style={styles.setupCard}>
            <View style={styles.setupCardHeader}>
              <View style={styles.setupCardIconBg}>
                <Text style={styles.setupCardIcon}>📅</Text>
              </View>
              <Text style={styles.setupCardTitle}>Target Exam Date</Text>
            </View>
            <Text style={styles.setupCardDesc}>Select your upcoming exam date to anchor the plan.</Text>
            <TextInput
              style={styles.dateInput}
              value={examDate}
              onChangeText={setExamDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.onSurfaceMuted}
            />
          </View>

          {/* Focus Areas Card */}
          <View style={styles.setupCard}>
            <View style={styles.setupCardHeader}>
              <View style={[styles.setupCardIconBg, { backgroundColor: Colors.accentGhost }]}>
                <Text style={styles.setupCardIcon}>🎯</Text>
              </View>
              <View style={styles.flexRowJustified}>
                <Text style={styles.setupCardTitle}>Focus Areas</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>✨ AI Suggested</Text>
                </View>
              </View>
            </View>
            <Text style={styles.setupCardDesc}>Select topics requiring extra attention.</Text>
            <View style={styles.tagContainer}>
              {focusTopics.map((topic, i) => (
                <TouchableOpacity key={i} style={styles.tagBtn} onPress={() => removeTopic(i)} activeOpacity={0.7}>
                  <Text style={styles.tagText}>{topic}</Text>
                  <Text style={styles.tagClose}>✕</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addTagBtn} onPress={addTopicPrompt} activeOpacity={0.7}>
                <Text style={styles.addTagText}>+ Add Topic</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Hours Capacity Card */}
          <View style={styles.setupCard}>
            <View style={styles.setupCardHeader}>
              <View style={[styles.setupCardIconBg, { backgroundColor: Colors.warningContainer }]}>
                <Text style={styles.setupCardIcon}>🕒</Text>
              </View>
              <Text style={styles.setupCardTitle}>Daily Capacity</Text>
            </View>
            <Text style={styles.setupCardDesc}>Select hours you can allocate per day.</Text>
            <View style={styles.hoursSelectionRow}>
              {[2, 4, 6, 8, 10, 12].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.hoursBtn, hoursPerDay === h && styles.hoursBtnActive]}
                  onPress={() => setHoursPerDay(h)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.hoursBtnText, hoursPerDay === h && { color: '#ffffff' }]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </View>

        {/* Generate plan button with sparkle gradient look */}
        <TouchableOpacity style={styles.generateBtn} onPress={generatePlan} activeOpacity={0.9}>
          <Text style={styles.generateBtnText}>✨ Generate Smart Plan</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper mock for Alerts text prompts on web/native
const Alert = {
  alert: (title: string, msg: string, buttons: any[], type?: string) => {
    if (Platform.OS === 'web') {
      const txt = prompt(msg);
      if (txt && buttons[1]?.onPress) {
        buttons[1].onPress(txt);
      }
    } else {
      // Standard native dialog prompt is simulated here, or fall back
      const txt = 'Modern History';
      if (buttons[1]?.onPress) buttons[1].onPress(txt);
    }
  }
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  flexRowJustified: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },

  // Setup/Parameter state styles
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    fontSize: 28,
  },
  subtitle: {
    ...Typography.body,
    marginTop: 4,
    lineHeight: 20,
  },
  setupGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  setupCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  setupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  setupCardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupCardIcon: {
    fontSize: 18,
  },
  setupCardTitle: {
    ...Typography.subtitle,
  },
  setupCardDesc: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
    marginLeft: 48,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
  },
  aiBadge: {
    backgroundColor: Colors.accentGhost,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  aiBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGhost,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.primary,
  },
  tagClose: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  addTagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  addTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  hoursSelectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hoursBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.primaryGlow,
  },
  hoursBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryGlow,
    marginTop: Spacing.sm,
  },
  generateBtnText: {
    ...Typography.button,
    fontSize: 16,
  },

  // Plan view Header
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    ...Shadows.subtle,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planHeaderIcon: {
    fontSize: 18,
  },
  planHeaderTitle: {
    ...Typography.subtitle,
    fontSize: 18,
  },
  statsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBtnText: {
    fontSize: 16,
  },

  // Day tab selector
  dayTabs: {
    maxHeight: 68,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceCard,
    ...Shadows.subtle,
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    minWidth: 56,
    backgroundColor: Colors.surfaceContainerLow,
  },
  dayTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.primaryGlow,
  },
  dayTabText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  dayTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dayTabHours: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.onSurfaceMuted,
    marginTop: 2,
  },

  taskScroll: {
    flex: 1,
  },

  // Progress Overview Card
  progressCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    margin: Spacing.md,
    ...Shadows.card,
  },
  circleProgressWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleProgressPlaceholder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: Colors.primary,
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
  },

  circleTextContainer: {
    alignItems: 'center',
  },
  circlePercentage: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  circleLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    color: Colors.onSurfaceMuted,
    letterSpacing: 0.5,
  },
  progressTextContainer: {
    flex: 1,
    gap: 4,
  },
  progressTitle: {
    ...Typography.subtitle,
  },
  progressSubtitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGhost,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  progressBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.primary,
  },

  // Task list timeline
  taskListBento: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  taskCategory: {
    gap: Spacing.xs,
  },
  categoryTitle: {
    ...Typography.overline,
    marginBottom: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.subtle,
    overflow: 'hidden',
    position: 'relative',
  },
  taskAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
  },
  checkBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  checkBtnChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  taskRowInfo: {
    flex: 1,
    gap: 2,
  },
  taskRowSubject: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  textLineThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskRowDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  durationBadge: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  taskRowTime: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceMuted,
    fontWeight: '600',
  },

  // Active current task row
  taskRowActive: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.card,
  },
  taskAccentBarActive: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  activeInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    paddingLeft: Spacing.md + 4,
  },
  activeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startBtnSmall: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  startBtnSmallText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },

  noTasks: {
    textAlign: 'center',
    padding: Spacing.xl,
    color: Colors.onSurfaceMuted,
    fontFamily: 'Inter_400Regular',
  },

  // APJ Kalam quote card — dark card
  quoteCard: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    alignItems: 'center',
    margin: Spacing.md,
    ...Shadows.elevated,
  },
  quoteIcon: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.2)',
    fontWeight: 'bold',
    marginBottom: -8,
  },
  quoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  quoteAuthor: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.5,
    marginTop: Spacing.sm,
    fontWeight: '700',
  },

  // Regenerate plan button
  regenerateBtn: {
    marginHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
  },
  regenerateBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },

  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadingTitle: {
    ...Typography.h3,
    marginTop: 20,
  },
  loadingSubtitle: {
    ...Typography.body,
    marginTop: 6,
  },
  errorCard: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.error,
  },
});

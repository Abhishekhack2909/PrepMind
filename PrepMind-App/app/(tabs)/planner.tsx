import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, TextInput, Platform,
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

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
        onPress: (text) => {
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
        <ActivityIndicator size="large" color={Colors.primary} />
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
                      <TouchableOpacity style={[styles.checkBtn, styles.checkBtnChecked]} activeOpacity={0.7}>
                        <Text style={styles.checkIcon}>✓</Text>
                      </TouchableOpacity>
                      <View style={styles.taskRowInfo}>
                        <Text style={[styles.taskRowSubject, styles.textLineThrough]}>{task.subject}</Text>
                        <Text style={styles.taskRowDesc}>{task.task}</Text>
                      </View>
                      <Text style={styles.taskRowTime}>{task.duration_mins}m</Text>
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
                      <View style={styles.activeLine} />
                      <View style={styles.activeInnerRow}>
                        <TouchableOpacity style={styles.checkBtn} activeOpacity={0.7} />
                        <View style={styles.taskRowInfo}>
                          <Text style={styles.taskRowSubject}>{task.subject}</Text>
                          <Text style={styles.taskRowDesc}>{task.task}</Text>
                        </View>
                        <View style={styles.activeAction}>
                          <Text style={[styles.taskRowTime, { marginRight: 8 }]}>{task.duration_mins}m</Text>
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
                      <TouchableOpacity style={styles.checkBtn} activeOpacity={0.7} />
                      <View style={styles.taskRowInfo}>
                        <Text style={styles.taskRowSubject}>{task.subject}</Text>
                        <Text style={styles.taskRowDesc}>{task.task}</Text>
                      </View>
                      <Text style={styles.taskRowTime}>{task.duration_mins}m</Text>
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
                      <TouchableOpacity style={styles.checkBtn} activeOpacity={0.7} />
                      <View style={styles.taskRowInfo}>
                        <Text style={styles.taskRowSubject}>{task.subject}</Text>
                        <Text style={styles.taskRowDesc}>{task.task}</Text>
                      </View>
                      <Text style={styles.taskRowTime}>{task.duration_mins}m</Text>
                    </View>
                  ))}
                </View>
              )}

            </View>
          ) : (
            <Text style={styles.noTasks}>No tasks planned for today</Text>
          )}

          {/* APJ Kalam Quote Card */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteIcon}>“</Text>
            <Text style={styles.quoteText}>
              "You have to dream before your dreams can come true."
            </Text>
            <Text style={styles.quoteAuthor}>- A.P.J. ABDUL KALAM</Text>
          </View>

          {/* Reset/Regenerate trigger */}
          <TouchableOpacity style={styles.regenerateBtn} onPress={() => setState('setup')} activeOpacity={0.7}>
            <Text style={styles.regenerateBtnText}>⟳ Configure Plan Parameters</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
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
              <Text style={styles.setupCardIcon}>📅</Text>
              <Text style={styles.setupCardTitle}>Target Exam Date</Text>
            </View>
            <Text style={styles.setupCardDesc}>Select your upcoming exam date to anchor the plan.</Text>
            <TextInput
              style={styles.dateInput}
              value={examDate}
              onChangeText={setExamDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.outline}
            />
          </View>

          {/* Focus Areas Card */}
          <View style={styles.setupCard}>
            <View style={styles.setupCardHeader}>
              <Text style={styles.setupCardIcon}>🎯</Text>
              <View style={styles.flexRowJustified}>
                <Text style={styles.setupCardTitle}>Focus Areas</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI Suggested</Text>
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
              <Text style={styles.setupCardIcon}>🕒</Text>
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
    backgroundColor: '#f8f9ff',
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
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: Colors.onSurface,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 20,
  },
  setupGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  setupCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  setupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  setupCardIcon: {
    fontSize: 18,
    color: '#006399',
  },
  setupCardTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  setupCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6f7882',
    marginBottom: Spacing.md,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#bec7d3',
    borderRadius: Radius.lg,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
    backgroundColor: '#f8f9ff',
  },
  aiBadge: {
    backgroundColor: '#eff4ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  aiBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#3f4851',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#cde5ff',
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 153, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#006399',
  },
  tagClose: {
    fontSize: 11,
    color: '#006399',
    fontWeight: 'bold',
  },
  addTagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#bec7d3',
    backgroundColor: '#f8f9ff',
  },
  addTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6f7882',
  },
  hoursSelectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hoursBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#bec7d3',
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursBtnActive: {
    backgroundColor: '#006399',
    borderColor: '#006399',
  },
  hoursBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#121c2a',
  },
  generateBtn: {
    backgroundColor: '#006399', // Sparkle gradient mockup
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#632ce5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginTop: Spacing.sm,
  },
  generateBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },

  // Plan view Header
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
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
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#121c2a',
    fontWeight: '700',
  },
  statsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBtnText: {
    fontSize: 16,
  },

  // Day tab selector
  dayTabs: {
    maxHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#bec7d3',
    minWidth: 54,
  },
  dayTabActive: {
    backgroundColor: '#006399',
    borderColor: '#006399',
  },
  dayTabText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: '#3f4851',
  },
  dayTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dayTabHours: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#6f7882',
    marginTop: 2,
  },

  taskScroll: {
    flex: 1,
  },

  // Progress Overview Card
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    margin: Spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  circleProgressWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#e6eeff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleProgressPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#006399',
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
  },
  circleTextContainer: {
    alignItems: 'center',
  },
  circlePercentage: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#121c2a',
    fontWeight: '700',
  },
  circleLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    color: '#6f7882',
    letterSpacing: 0.5,
  },
  progressTextContainer: {
    flex: 1,
    gap: 4,
  },
  progressTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#121c2a',
    fontWeight: '700',
  },
  progressSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3f4851',
    lineHeight: 16,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
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
    backgroundColor: '#006399',
  },
  progressBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#3f4851',
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
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6f7882',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.15)',
    gap: Spacing.md,
  },
  checkBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#bec7d3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnChecked: {
    backgroundColor: '#006399',
    borderColor: '#006399',
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
    color: '#121c2a',
    fontWeight: '600',
  },
  textLineThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskRowDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6f7882',
  },
  taskRowTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#bec7d3',
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },

  // Active current task row
  taskRowActive: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 153, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  activeLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#006399',
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
  },
  startBtnSmall: {
    backgroundColor: '#006399',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  startBtnSmallText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },

  noTasks: {
    textAlign: 'center',
    padding: Spacing.xl,
    color: '#6f7882',
    fontFamily: 'Inter_400Regular',
  },

  // APJ Kalam quote card
  quoteCard: {
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.15)',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    margin: Spacing.md,
  },
  quoteIcon: {
    fontSize: 32,
    color: 'rgba(0, 99, 153, 0.2)',
    fontWeight: 'bold',
    marginBottom: -8,
  },
  quoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  quoteAuthor: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6f7882',
    letterSpacing: 1.5,
    marginTop: Spacing.sm,
    fontWeight: '700',
  },

  // Regenerate plan button
  regenerateBtn: {
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: '#bec7d3',
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  regenerateBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#3f4851',
  },

  loadingTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: Colors.onSurface,
    marginTop: 20,
  },
  loadingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 6,
  },
  errorCard: {
    backgroundColor: '#ffdad6',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.3)',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#ba1a1a',
  },
});

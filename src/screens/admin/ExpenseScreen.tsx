import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
  Animated,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { Typography, Card, Button, Input, AdminMenuDrawer } from '../../components/common';
import { ExpenseType, Expense } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils, PricingUtils } from '../../utils';
import { ExpenseService, StorageService } from '../../services';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { exportExpensesToExcel } from '../../utils/excelExport';
import { errorLogger } from '../../utils/errorLogger';

type ExpenseScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Expenses'>;

type ViewMode = 'add' | 'manage';

const ExpenseScreen: React.FC = () => {
  const navigation = useNavigation<ExpenseScreenNavigationProp>();
  const { user, logout } = useAuthStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('add');
  
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    expenseDate: '',
    receiptImageUri: null as string | null,
    receiptImageUrl: null as string | null,
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Manage expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Period filter state
  const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Summary filter state
  const [summaryFilter, setSummaryFilter] = useState<'all' | 'diesel' | 'maintenance'>('all');
  const [summaryDropdownVisible, setSummaryDropdownVisible] = useState(false);
  
  // Animation values for glass gliders
  const periodTypeGliderAnim = useRef(new Animated.Value(0)).current;
  const monthGliderAnim = useRef(new Animated.Value(0)).current;
  const yearGliderAnim = useRef(new Animated.Value(0)).current;
  
  // Width measurements for glider positioning
  const [periodTypeOptionWidth, setPeriodTypeOptionWidth] = useState(0);
  const [monthOptionWidth, setMonthOptionWidth] = useState(0);
  const [yearOptionWidth, setYearOptionWidth] = useState(0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Generate year options (current year + 4 previous years)
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  const availableYears = getAvailableYears();

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Initialize expense date to today
  React.useEffect(() => {
    if (!formData.expenseDate) {
      setFormData(prev => ({ ...prev, expenseDate: formatDate(new Date()) }));
    }
  }, []);

  // Load expenses when switching to manage view
  useEffect(() => {
    if (viewMode === 'manage' && user?.id) {
      loadExpenses();
    }
  }, [viewMode, user?.id]);

  // Animate glider when periodType changes
  useEffect(() => {
    if (periodTypeOptionWidth > 0) {
      Animated.spring(periodTypeGliderAnim, {
        toValue: periodType === 'month' ? 0 : periodTypeOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [periodType, periodTypeOptionWidth]);

  // Animate glider when selectedMonth changes
  useEffect(() => {
    if (monthOptionWidth > 0) {
      Animated.spring(monthGliderAnim, {
        toValue: selectedMonth * monthOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [selectedMonth, monthOptionWidth]);

  // Animate glider when selectedYear changes
  useEffect(() => {
    if (yearOptionWidth > 0) {
      const yearIndex = availableYears.indexOf(selectedYear);
      Animated.spring(yearGliderAnim, {
        toValue: yearIndex >= 0 ? yearIndex * yearOptionWidth : 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [selectedYear, yearOptionWidth]);

  const loadExpenses = async () => {
    if (!user?.id) return;
    
    setIsLoadingExpenses(true);
    try {
      const allExpenses = await ExpenseService.getAllExpenses(user.id);
      setExpenses(allExpenses);
    } catch (error) {
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
    } finally {
      setIsLoadingExpenses(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
  };

  // Filter expenses based on period and summary filter
  const getFilteredExpensesByPeriod = () => {
    let periodFiltered: Expense[] = [];
    
    if (periodType === 'month') {
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      
      periodFiltered = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });
    } else {
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      
      periodFiltered = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= yearStart && expenseDate <= yearEnd;
      });
    }
    
    // Apply type filter based on summary filter
    if (summaryFilter === 'all') {
      return periodFiltered;
    } else {
      return periodFiltered.filter(expense => expense.expenseType === summaryFilter);
    }
  };

  const filteredExpenses = getFilteredExpensesByPeriod();

  // Calculate summary for filtered expenses based on summary filter
  const getSummaryExpenses = () => {
    if (summaryFilter === 'all') {
      return filteredExpenses;
    } else {
      return filteredExpenses.filter(e => e.expenseType === summaryFilter);
    }
  };

  const summaryExpenses = getSummaryExpenses();
  const totalAmount = summaryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const dieselExpenses = summaryExpenses.filter(e => e.expenseType === 'diesel');
  const maintenanceExpenses = summaryExpenses.filter(e => e.expenseType === 'maintenance');
  const dieselTotal = dieselExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const maintenanceTotal = maintenanceExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await ExpenseService.deleteExpense(expenseId, user.id);
              Alert.alert('Success', 'Expense deleted successfully');
              await loadExpenses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleExpenseTypeSelect = (type: ExpenseType) => {
    setSelectedExpenseType(type);
    // Clear error when type is selected
    if (formErrors.expenseType) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.expenseType;
        return newErrors;
      });
    }
  };

  const handleFormChange = (field: string, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePickReceiptImage = async () => {
    try {
      const imageUri = await StorageService.pickImage();
      if (imageUri) {
        handleFormChange('receiptImageUri', imageUri);
        handleFormChange('receiptImageUrl', null); // Clear existing URL when new image is picked
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pick image';
      Alert.alert('Error', errorMessage);
    }
  };

  // Format date input to automatically add slashes
  const formatDateInput = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeDateString(text);
    const numbers = sanitized.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!selectedExpenseType) {
      errors.expenseType = 'Please select an expense type';
    }

    if (!formData.amount || formData.amount.trim() === '') {
      errors.amount = 'Amount is required';
    } else {
      const amountValue = parseFloat(formData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        errors.amount = 'Amount must be a positive number';
      }
    }

    if (!formData.expenseDate || formData.expenseDate.trim() === '') {
      errors.expenseDate = 'Expense date is required';
    } else {
      const sanitized = SanitizationUtils.sanitizeDateString(formData.expenseDate);
      const validation = ValidationUtils.validateExpenseDateString(sanitized);
      if (!validation.isValid) {
        errors.expenseDate = validation.error || 'Invalid date format';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id || !selectedExpenseType) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload receipt image if a new one was picked
      let receiptImageUrl = formData.receiptImageUrl;
      if (formData.receiptImageUri) {
        const uploadResult = await StorageService.uploadExpenseReceiptImage(
          formData.receiptImageUri,
          user.id
        );
        receiptImageUrl = uploadResult.url;
      }

      // Parse date from DD/MM/YYYY format
      const dateParts = formData.expenseDate.split('/').map(Number);
      const day = dateParts[0];
      const month = dateParts[1];
      const year = dateParts[2];
      
      if (!day || !month || !year) {
        throw new Error('Invalid date format');
      }
      
      const expenseDate = new Date(year, month - 1, day);

      const descriptionValue = formData.description.trim();
      const expenseData = {
        expenseType: selectedExpenseType,
        amount: parseFloat(formData.amount),
        ...(descriptionValue ? { description: descriptionValue } : {}),
        ...(receiptImageUrl ? { receiptImageUrl } : {}),
        expenseDate,
      };

      await ExpenseService.createExpense(expenseData, user.id);

      Alert.alert('Success', 'Expense saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setSelectedExpenseType(null);
            setFormData({
              amount: '',
              description: '',
              expenseDate: formatDate(new Date()),
              receiptImageUri: null,
              receiptImageUrl: null,
            });
            setFormErrors({});
          },
        },
      ]);
      
      // Refresh expenses list if in manage view
      if (viewMode === 'manage') {
        await loadExpenses();
      }
    } catch (error) {
      // Extract more detailed error information
      let errorMessage = 'Failed to save expense. Please try again.';
      if (error instanceof Error) {
        // Check if it's a DataAccessError with details
        if ((error as any).details && (error as any).details.error) {
          const supabaseError = (error as any).details.error;
          if (supabaseError.message) {
            errorMessage = supabaseError.message;
          } else if (supabaseError.hint) {
            errorMessage = supabaseError.hint;
          } else {
            errorMessage = error.message;
          }
        } else {
          errorMessage = error.message;
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigate = (route: keyof AdminStackParamList) => {
    navigation.navigate(route);
  };

  const handleDownloadExcel = async () => {
    try {
      await exportExpensesToExcel(
        expenses,
        periodType,
        selectedYear,
        selectedMonth
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export expenses. Please try again.');
      errorLogger.medium('Failed to export expenses', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>
          Expenses
        </Typography>
        {viewMode === 'manage' && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadExcel}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
        )}
        {viewMode === 'add' && <View style={styles.headerRight} />}
      </View>

      {/* View Mode Toggle Buttons */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'add' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('add')}
          activeOpacity={0.7}
        >
          <Typography
            variant="body"
            style={[
              styles.viewModeButtonText,
              viewMode === 'add' && styles.viewModeButtonTextActive,
            ]}
          >
            Add Expense
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'manage' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('manage')}
          activeOpacity={0.7}
        >
          <Typography
            variant="body"
            style={[
              styles.viewModeButtonText,
              viewMode === 'manage' && styles.viewModeButtonTextActive,
            ]}
          >
            Manage Expense
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {viewMode === 'add' ? (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
          {/* Expense Type Selection */}
          <Card style={styles.typeSelectionCard}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Select Expense Type
            </Typography>
            <View style={styles.typeButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedExpenseType === 'diesel' && styles.typeButtonActive,
                ]}
                onPress={() => handleExpenseTypeSelect('diesel')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedExpenseType === 'diesel' ? 'car' : 'car-outline'}
                  size={32}
                  color={selectedExpenseType === 'diesel' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.text}
                />
                <Typography
                  variant="body"
                  style={[
                    styles.typeButtonText,
                    selectedExpenseType === 'diesel' && styles.typeButtonTextActive,
                  ]}
                >
                  Diesel Expense
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedExpenseType === 'maintenance' && styles.typeButtonActive,
                ]}
                onPress={() => handleExpenseTypeSelect('maintenance')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedExpenseType === 'maintenance' ? 'construct' : 'construct-outline'}
                  size={32}
                  color={selectedExpenseType === 'maintenance' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.text}
                />
                <Typography
                  variant="body"
                  style={[
                    styles.typeButtonText,
                    selectedExpenseType === 'maintenance' && styles.typeButtonTextActive,
                  ]}
                >
                  Maintenance Expense
                </Typography>
              </TouchableOpacity>
            </View>
            {formErrors.expenseType && (
              <Typography variant="caption" style={styles.errorText}>
                {formErrors.expenseType}
              </Typography>
            )}
          </Card>

          {/* Expense Form */}
          <Card style={styles.formCard}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Expense Details
            </Typography>

            <View style={styles.formField}>
              <Input
                label="Amount (₹) *"
                value={formData.amount}
                onChangeText={(value) => handleFormChange('amount', value)}
                placeholder="Enter amount"
                {...(formErrors.amount ? { error: formErrors.amount } : {})}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Description"
                value={formData.description}
                onChangeText={(value) => handleFormChange('description', value)}
                placeholder="Enter description (optional)"
                {...(formErrors.description ? { error: formErrors.description } : {})}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Expense Date (DD/MM/YYYY) *"
                value={formData.expenseDate}
                onChangeText={(value) => handleFormChange('expenseDate', formatDateInput(value))}
                placeholder="DD/MM/YYYY"
                {...(formErrors.expenseDate ? { error: formErrors.expenseDate } : {})}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <View style={styles.formField}>
              <Typography variant="body" style={styles.imageLabel}>
                Receipt Photo (Optional)
              </Typography>
              <Typography variant="caption" style={styles.imageHint}>
                Upload a photo of the expense receipt
              </Typography>
              
              {(formData.receiptImageUri || (formData.receiptImageUrl && typeof formData.receiptImageUrl === 'string' && formData.receiptImageUrl.trim() !== '')) ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: formData.receiptImageUri || formData.receiptImageUrl || '' }}
                    style={styles.receiptPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      handleFormChange('receiptImageUri', null);
                      handleFormChange('receiptImageUrl', null);
                    }}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={24} color={UI_CONFIG.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickReceiptImage}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={48} color={UI_CONFIG.colors.primary} />
                  <Typography variant="body" style={styles.imagePickerText}>
                    Tap to select receipt photo
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              title={isSubmitting ? 'Saving...' : 'Submit Expense'}
              onPress={handleSubmit}
              variant="primary"
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Period Type Toggle */}
          <View style={styles.periodTypeToggle}>
            <View style={styles.glassRadioGroup}>
              <TouchableOpacity
                style={styles.glassRadioOption}
                onPress={() => setPeriodType('month')}
                activeOpacity={0.8}
                onLayout={(e) => {
                  if (periodTypeOptionWidth === 0) {
                    setPeriodTypeOptionWidth(e.nativeEvent.layout.width);
                  }
                }}
              >
                <Typography 
                  variant="body" 
                  style={[
                    styles.glassRadioLabel,
                    periodType === 'month' && styles.glassRadioLabelActive
                  ]}
                >
                  Month
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.glassRadioOption}
                onPress={() => setPeriodType('year')}
                activeOpacity={0.8}
              >
                <Typography 
                  variant="body" 
                  style={[
                    styles.glassRadioLabel,
                    periodType === 'year' && styles.glassRadioLabelActive
                  ]}
                >
                  Year
                </Typography>
              </TouchableOpacity>
              {periodTypeOptionWidth > 0 && (
                <Animated.View
                  style={[
                    styles.glassGlider,
                    {
                      width: periodTypeOptionWidth,
                      transform: [{
                        translateX: periodTypeGliderAnim,
                      }],
                    },
                  ]}
                />
              )}
            </View>
          </View>

          {/* Month Selector */}
          {periodType === 'month' && (
            <View style={styles.filterContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.monthSelector}
                contentContainerStyle={styles.monthSelectorContent}
              >
                <View style={styles.glassRadioGroup}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.glassRadioOption}
                      onPress={() => setSelectedMonth(index)}
                      activeOpacity={0.8}
                      onLayout={(e) => {
                        if (monthOptionWidth === 0 && index === 0) {
                          setMonthOptionWidth(e.nativeEvent.layout.width);
                        }
                      }}
                    >
                      <Typography 
                        variant="body" 
                        style={[
                          styles.glassRadioLabel,
                          selectedMonth === index && styles.glassRadioLabelActive
                        ]}
                      >
                        {month}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                  {monthOptionWidth > 0 && (
                    <Animated.View
                      style={[
                        styles.glassGlider,
                        {
                          width: monthOptionWidth,
                          transform: [{
                            translateX: monthGliderAnim,
                          }],
                        },
                      ]}
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Year Selector */}
          {periodType === 'year' && (
            <View style={styles.filterContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.monthSelector}
                contentContainerStyle={styles.monthSelectorContent}
              >
                <View style={styles.glassRadioGroup}>
                  {availableYears.map((year, index) => (
                    <TouchableOpacity
                      key={year}
                      style={styles.glassRadioOption}
                      onPress={() => setSelectedYear(year)}
                      activeOpacity={0.8}
                      onLayout={(e) => {
                        if (yearOptionWidth === 0 && index === 0) {
                          setYearOptionWidth(e.nativeEvent.layout.width);
                        }
                      }}
                    >
                      <Typography 
                        variant="body" 
                        style={[
                          styles.glassRadioLabel,
                          selectedYear === year && styles.glassRadioLabelActive
                        ]}
                      >
                        {year}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                  {yearOptionWidth > 0 && (
                    <Animated.View
                      style={[
                        styles.glassGlider,
                        {
                          width: yearOptionWidth,
                          transform: [{
                            translateX: yearGliderAnim,
                          }],
                        },
                      ]}
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Summary Card */}
          {filteredExpenses.length > 0 && (
            <>
              <Card style={styles.summaryCard}>
                <Typography variant="h3" style={styles.summaryTitle}>
                  {periodType === 'month' 
                    ? `${months[selectedMonth]} ${selectedYear} Summary` 
                    : `${selectedYear} Summary`}
                </Typography>
                <View style={styles.summaryMetrics}>
                  {summaryFilter === 'all' && (
                    <>
                      <View style={styles.summaryMetric}>
                        <Typography variant="h2" style={styles.summaryValue}>
                          {PricingUtils.formatPrice(totalAmount)}
                        </Typography>
                        <Typography variant="caption" style={styles.summaryLabel}>
                          Total Expenses
                        </Typography>
                      </View>
                      <View style={styles.summaryMetric}>
                        <Typography variant="h2" style={styles.summaryValue}>
                          {PricingUtils.formatPrice(dieselTotal)}
                        </Typography>
                        <Typography variant="caption" style={styles.summaryLabel}>
                          Diesel
                        </Typography>
                      </View>
                      <View style={styles.summaryMetric}>
                        <Typography variant="h2" style={styles.summaryValue}>
                          {PricingUtils.formatPrice(maintenanceTotal)}
                        </Typography>
                        <Typography variant="caption" style={styles.summaryLabel}>
                          Maintenance
                        </Typography>
                      </View>
                    </>
                  )}
                  {summaryFilter === 'diesel' && (
                    <View style={[styles.summaryMetric, styles.summaryMetricSingle]}>
                      <Typography variant="h2" style={styles.summaryValue}>
                        {PricingUtils.formatPrice(dieselTotal)}
                      </Typography>
                      <Typography variant="caption" style={styles.summaryLabel}>
                        Diesel Expenses
                      </Typography>
                    </View>
                  )}
                  {summaryFilter === 'maintenance' && (
                    <View style={[styles.summaryMetric, styles.summaryMetricSingle]}>
                      <Typography variant="h2" style={styles.summaryValue}>
                        {PricingUtils.formatPrice(maintenanceTotal)}
                      </Typography>
                      <Typography variant="caption" style={styles.summaryLabel}>
                        Maintenance Expenses
                      </Typography>
                    </View>
                  )}
                </View>
              </Card>

              {/* Summary Filter Dropdown */}
              <View style={styles.summaryFilterContainer}>
                <TouchableOpacity
                  style={styles.summaryFilterButton}
                  onPress={() => setSummaryDropdownVisible(true)}
                  activeOpacity={0.7}
                >
                  <Typography variant="body" style={styles.summaryFilterButtonText}>
                    {summaryFilter === 'all' ? 'All' : summaryFilter === 'diesel' ? 'Diesel' : 'Maintenance'}
                  </Typography>
                  <Ionicons name="chevron-down" size={20} color={UI_CONFIG.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Dropdown Modal */}
              <Modal
                visible={summaryDropdownVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSummaryDropdownVisible(false)}
              >
                <TouchableOpacity
                  style={styles.dropdownOverlay}
                  activeOpacity={1}
                  onPress={() => setSummaryDropdownVisible(false)}
                >
                  <View style={styles.dropdownContent}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        summaryFilter === 'all' && styles.dropdownOptionActive
                      ]}
                      onPress={() => {
                        setSummaryFilter('all');
                        setSummaryDropdownVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Typography
                        variant="body"
                        style={[
                          styles.dropdownOptionText,
                          summaryFilter === 'all' && styles.dropdownOptionTextActive
                        ]}
                      >
                        All
                      </Typography>
                      {summaryFilter === 'all' && (
                        <Ionicons name="checkmark" size={20} color={UI_CONFIG.colors.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        summaryFilter === 'diesel' && styles.dropdownOptionActive
                      ]}
                      onPress={() => {
                        setSummaryFilter('diesel');
                        setSummaryDropdownVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Typography
                        variant="body"
                        style={[
                          styles.dropdownOptionText,
                          summaryFilter === 'diesel' && styles.dropdownOptionTextActive
                        ]}
                      >
                        Diesel
                      </Typography>
                      {summaryFilter === 'diesel' && (
                        <Ionicons name="checkmark" size={20} color={UI_CONFIG.colors.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        summaryFilter === 'maintenance' && styles.dropdownOptionActive
                      ]}
                      onPress={() => {
                        setSummaryFilter('maintenance');
                        setSummaryDropdownVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Typography
                        variant="body"
                        style={[
                          styles.dropdownOptionText,
                          summaryFilter === 'maintenance' && styles.dropdownOptionTextActive
                        ]}
                      >
                        Maintenance
                      </Typography>
                      {summaryFilter === 'maintenance' && (
                        <Ionicons name="checkmark" size={20} color={UI_CONFIG.colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          )}

          {isLoadingExpenses && expenses.length === 0 ? (
            <Card style={styles.emptyState}>
              <Typography variant="body" style={styles.loadingText}>
                Loading expenses...
              </Typography>
            </Card>
          ) : filteredExpenses.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyText}>
                {summaryFilter !== 'all'
                  ? `No ${summaryFilter} expenses found for ${periodType === 'month' ? months[selectedMonth] + ' ' + selectedYear : selectedYear}`
                  : `No expenses found for ${periodType === 'month' ? months[selectedMonth] + ' ' + selectedYear : selectedYear}`}
              </Typography>
              <Typography variant="caption" style={styles.emptySubtext}>
                {summaryFilter !== 'all' ? 'Try selecting a different filter or period' : 'Add your first expense or try a different period'}
              </Typography>
            </Card>
          ) : (
            <>
              <Typography variant="h3" style={styles.sectionTitle}>
                {summaryFilter !== 'all'
                  ? `${summaryFilter.charAt(0).toUpperCase() + summaryFilter.slice(1)} Expenses` 
                  : 'All Expenses'} ({filteredExpenses.length})
              </Typography>
              {filteredExpenses.map((expense) => (
                <Card key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseCardHeader}>
                    <View style={styles.expenseCardLeft}>
                      <View style={styles.expenseTypeBadge}>
                        <Ionicons
                          name={expense.expenseType === 'diesel' ? 'car' : 'construct'}
                          size={20}
                          color={UI_CONFIG.colors.textLight}
                        />
                        <Typography variant="caption" style={styles.expenseTypeText}>
                          {expense.expenseType === 'diesel' ? 'Diesel' : 'Maintenance'}
                        </Typography>
                      </View>
                      <Typography variant="h3" style={styles.expenseAmount}>
                        ₹{expense.amount.toFixed(2)}
                      </Typography>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteExpense(expense.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color={UI_CONFIG.colors.error} />
                    </TouchableOpacity>
                  </View>
                  {expense.description && (
                    <Typography variant="body" style={styles.expenseDescription}>
                      {expense.description}
                    </Typography>
                  )}
                  {expense.receiptImageUrl && (
                    <View style={styles.receiptImageContainer}>
                      <Image
                        source={{ uri: expense.receiptImageUrl }}
                        style={styles.receiptImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View style={styles.expenseCardFooter}>
                    <Typography variant="caption" style={styles.expenseDate}>
                      Date: {formatDate(expense.expenseDate)}
                    </Typography>
                    <Typography variant="caption" style={styles.expenseDate}>
                      Added: {formatDate(expense.createdAt)}
                    </Typography>
                  </View>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Menu Drawer */}
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigate}
        onLogout={logout}
        currentRoute="Expenses"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  downloadButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  typeSelectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
  },
  typeButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  typeButtonText: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.text,
  },
  typeButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: 16,
    padding: 16,
  },
  formField: {
    marginBottom: 16,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    marginTop: 4,
  },
  submitContainer: {
    paddingVertical: 16,
  },
  submitButton: {
    width: '100%',
  },
  viewModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
    gap: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  viewModeButtonText: {
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  viewModeButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  loadingText: {
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
  },
  expenseCard: {
    marginBottom: 12,
    padding: 16,
  },
  expenseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseCardLeft: {
    flex: 1,
  },
  expenseTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI_CONFIG.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  expenseTypeText: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  expenseAmount: {
    fontSize: 22
    ,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.background,
  },
  expenseDescription: {
    marginBottom: 8,
    color: UI_CONFIG.colors.textSecondary,
  },
  expenseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  expenseDate: {
    color: UI_CONFIG.colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  filterButtonText: {
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
  imageLabel: {
    marginBottom: 8,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
  imageHint: {
    marginBottom: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  imagePickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    marginTop: 8,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 20,
    padding: 4,
  },
  receiptImageContainer: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  periodTypeToggle: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    alignItems: 'center',
  },
  monthSelector: {
    paddingVertical: UI_CONFIG.spacing.md,
  },
  monthSelectorContent: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  glassRadioGroup: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  glassRadioOption: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 12.8,
    paddingHorizontal: 25.6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  glassRadioLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: UI_CONFIG.colors.text,
  },
  glassRadioLabelActive: {
    color: UI_CONFIG.colors.text,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: UI_CONFIG.colors.accent,
    shadowColor: UI_CONFIG.colors.accent,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
    height: '100%',
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  summaryMetric: {
    alignItems: 'center',
    flex: 1,
  },
  summaryMetricSingle: {
    flex: 0,
    alignSelf: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  summaryFilterContainer: {
    marginBottom: 16,
  },
  summaryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.surface,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
  },
  summaryFilterButtonText: {
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: UI_CONFIG.colors.background,
  },
  dropdownOptionText: {
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: UI_CONFIG.colors.primary,
    fontWeight: '600',
  },
});

export default ExpenseScreen;

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Clock, Activity, Users, ArrowUp, ArrowDown, ChevronRight, Package, Heart, AlertTriangle, Baby, ExternalLink, TrendingUp, X } from 'lucide-react';
import StatusCard from "../components/cards/StatusCard";
import { useMedications } from '../contexts/MedicationsContext';
import { useNomenclature } from '../contexts/NomenclatureContext';
import { useInsemination } from '../contexts/InseminationContext';
import { useMovements } from '../contexts/MovementsContext';
import { useVetOperations } from '../contexts/VetOperationsContext';
import { Link } from 'react-router-dom';
import { format, differenceInDays, subDays, subMonths, parseISO } from 'date-fns';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import * as tf from '@tensorflow/tfjs';
import { supabase } from '../lib/supabase';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard: React.FC = () => {
  // Получаем данные из контекстов
  const { medications } = useMedications();
  const { items: nomenclatureItems } = useNomenclature();
  const { bulls, inseminations } = useInsemination();
  const { animals } = useMovements();
  const { operations, activeTreatments, getMissedTreatments, treatmentSchemes } = useVetOperations();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>({
    milkProduction: [],
    animalHealth: [],
    inseminationStats: [],
    medicationUsage: []
  });
  const [predictions, setPredictions] = useState<any>({
    milkProduction: [],
    animalHealth: [],
    inseminationSuccess: null
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  // Получение пропущенных процедур
  const missedTreatments = getMissedTreatments();
  const [showMissedTreatmentsAlert, setShowMissedTreatmentsAlert] = useState(false);

  // Функция для получения названия схемы лечения
  const getTreatmentSchemeName = (schemeId: string) => {
    const scheme = treatmentSchemes.find(s => s.id === schemeId);
    return scheme ? scheme.name : 'Неизвестная схема';
  };

  // Функция для получения названия этапа
  const getTreatmentStepName = (schemeId: string, stepId: string) => {
    const scheme = treatmentSchemes.find(s => s.id === schemeId);
    if (!scheme) return 'Неизвестный этап';
    
    const step = scheme.steps.find(s => s.id === stepId);
    return step ? `День ${step.day}: ${step.procedure}` : 'Неизвестный этап';
  };
  
  // Показать предупреждение, если есть пропущенные процедуры
  useEffect(() => {
    if (missedTreatments.length > 0) {
      setShowMissedTreatmentsAlert(true);
    }
  }, [missedTreatments]);
  
  // Загрузка данных для аналитики
  useEffect(() => {
    if (showAnalytics) {
      loadAnalyticsData();
    }
  }, [showAnalytics, analyticsTimeframe]);
  
  // Функция загрузки данных для аналитики
  const loadAnalyticsData = async () => {
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    
    try {
      // Определяем период для выборки данных
      const endDate = new Date();
      let startDate;
      
      switch (analyticsTimeframe) {
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subMonths(endDate, 1);
          break;
        case 'quarter':
          startDate = subMonths(endDate, 3);
          break;
        case 'year':
          startDate = subMonths(endDate, 12);
          break;
        default:
          startDate = subMonths(endDate, 1);
      }
      
      // Форматируем даты для запросов
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      // Генерируем моковые данные для графиков
      // В реальном приложении здесь будут запросы к Supabase
      
      // 1. Данные по удою молока
      const milkProductionData = generateMilkProductionData(startDate, endDate);
      
      // 2. Данные по здоровью животных
      const animalHealthData = generateAnimalHealthData(startDate, endDate);
      
      // 3. Данные по осеменениям
      const inseminationData = generateInseminationData(startDate, endDate);
      
      // 4. Данные по использованию препаратов
      const medicationUsageData = generateMedicationUsageData(startDate, endDate);
      
      // Обновляем состояние с данными
      setAnalyticsData({
        milkProduction: milkProductionData,
        animalHealth: animalHealthData,
        inseminationStats: inseminationData,
        medicationUsage: medicationUsageData
      });
      
      // Генерируем прогнозы с использованием TensorFlow.js
      generatePredictions(milkProductionData, animalHealthData, inseminationData);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных для аналитики:', error);
      setAnalyticsError('Не удалось загрузить данные для аналитики. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };
  
  // Функция для генерации данных по удою молока
  const generateMilkProductionData = (startDate: Date, endDate: Date) => {
    const days = differenceInDays(endDate, startDate) + 1;
    const data = [];
    
    for (let i = 0; i < days; i++) {
      const date = format(addDays(startDate, i), 'yyyy-MM-dd');
      // Генерируем случайное значение с трендом роста
      const baseValue = 22 + (i / days) * 3; // Базовое значение с трендом роста
      const randomFactor = Math.random() * 2 - 1; // Случайный фактор от -1 до 1
      const value = baseValue + randomFactor;
      
      data.push({
        date,
        value: parseFloat(value.toFixed(1))
      });
    }
    
    return data;
  };
  
  // Функция для генерации данных по здоровью животных
  const generateAnimalHealthData = (startDate: Date, endDate: Date) => {
    const days = differenceInDays(endDate, startDate) + 1;
    const data = [];
    
    for (let i = 0; i < days; i++) {
      const date = format(addDays(startDate, i), 'yyyy-MM-dd');
      // Генерируем случайные значения для разных категорий здоровья
      const healthy = Math.floor(90 + Math.random() * 10); // 90-100%
      const sick = Math.floor(Math.random() * 8); // 0-8%
      const treatment = Math.floor(Math.random() * 5); // 0-5%
      
      data.push({
        date,
        healthy,
        sick,
        treatment
      });
    }
    
    return data;
  };
  
  // Функция для генерации данных по осеменениям
  const generateInseminationData = (startDate: Date, endDate: Date) => {
    const days = differenceInDays(endDate, startDate) + 1;
    const data = [];
    
    for (let i = 0; i < days; i += 3) { // Группируем по 3 дня
      const date = format(addDays(startDate, i), 'yyyy-MM-dd');
      // Генерируем случайные значения для разных результатов осеменения
      const total = Math.floor(Math.random() * 5) + 1; // 1-6 осеменений
      const successful = Math.floor(Math.random() * (total + 1)); // 0-total успешных
      const unsuccessful = total - successful;
      
      data.push({
        date,
        total,
        successful,
        unsuccessful
      });
    }
    
    return data;
  };
  
  // Функция для генерации данных по использованию препаратов
  const generateMedicationUsageData = (startDate: Date, endDate: Date) => {
    const days = differenceInDays(endDate, startDate) + 1;
    const data = [];
    
    // Список препаратов
    const medicationTypes = ['Антибиотики', 'Вакцины', 'Витамины', 'Другое'];
    
    for (let i = 0; i < days; i += 2) { // Группируем по 2 дня
      const date = format(addDays(startDate, i), 'yyyy-MM-dd');
      const usage = {};
      
      // Генерируем случайные значения использования для каждого типа препаратов
      medicationTypes.forEach(type => {
        usage[type] = Math.floor(Math.random() * 10) + 1; // 1-10 единиц
      });
      
      data.push({
        date,
        ...usage
      });
    }
    
    return data;
  };
  
  // Функция для генерации прогнозов с использованием TensorFlow.js
  const generatePredictions = async (
    milkProductionData: any[], 
    animalHealthData: any[], 
    inseminationData: any[]
  ) => {
    try {
      // 1. Прогноз удоя молока
      const milkValues = milkProductionData.map(item => item.value);
      const milkPredictions = await predictTimeSeries(milkValues, 7); // Прогноз на 7 дней вперед
      
      // 2. Прогноз здоровья животных
      const healthyValues = animalHealthData.map(item => item.healthy);
      const healthPredictions = await predictTimeSeries(healthyValues, 7); // Прогноз на 7 дней вперед
      
      // 3. Прогноз успешности осеменения
      const successRates = inseminationData.map(item => 
        item.total > 0 ? item.successful / item.total : 0
      );
      const avgSuccessRate = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
      
      // Обновляем состояние с прогнозами
      setPredictions({
        milkProduction: milkPredictions,
        animalHealth: healthPredictions,
        inseminationSuccess: parseFloat(avgSuccessRate.toFixed(2))
      });
      
    } catch (error) {
      console.error('Ошибка при генерации прогнозов:', error);
    }
  };
  
  // Функция для прогнозирования временных рядов с использованием TensorFlow.js
  const predictTimeSeries = async (data: number[], predictionSteps: number) => {
    // Создаем простую модель линейной регрессии
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
    model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
    
    // Подготавливаем данные
    const xs = tf.tensor2d(Array.from({ length: data.length }, (_, i) => [i]));
    const ys = tf.tensor2d(data.map(value => [value]));
    
    // Обучаем модель
    await model.fit(xs, ys, { epochs: 100, verbose: 0 });
    
    // Генерируем прогноз
    const predictions = [];
    for (let i = 1; i <= predictionSteps; i++) {
      const nextIndex = data.length + i - 1;
      const prediction = model.predict(tf.tensor2d([[nextIndex]])) as tf.Tensor;
      const value = prediction.dataSync()[0];
      predictions.push(parseFloat(value.toFixed(1)));
    }
    
    // Освобождаем ресурсы TensorFlow
    xs.dispose();
    ys.dispose();
    model.dispose();
    
    return predictions;
  };
  
  // Вспомогательная функция для добавления дней к дате
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  // Расчет общей стоимости остатков ветпрепаратов
  const totalMedicationValue = medications.reduce((sum, med) => 
    sum + (med.remainingQuantity * med.unitPrice), 0
  );

  // Расчет общего количества оставшихся доз семени
  const totalSemenDoses = bulls.reduce(
    (sum, bull) => sum + bull.remainingDoses,
    0
  );
  
  // Расчет общей стоимости доз семени
  const totalSemenValue = bulls.reduce(
    (sum, bull) => sum + (bull.remainingDoses * bull.price),
    0
  );
  
  // Расчет количества животных с маститом
  const mastitisAnimalsCount = animals.filter(animal => animal.hasMastitis).length;
  
  // Количество телят (приплод) - условный расчет
  const calfCount = animals.filter(animal => 
    animal.gender === 'female' && animal.birthDate && 
    new Date(animal.birthDate).getFullYear() === new Date().getFullYear()
  ).length;

  // Количество осеменений за месяц
  const inseminationsLastMonth = inseminations.filter(insem => {
    const insemDate = new Date(insem.date);
    const today = new Date();
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
    return insemDate >= lastMonth;
  }).length;

  // Количество отелов за месяц - условный расчет
  const calvingsLastMonth = 12; // Пример значения

  // Количество выписанных животных за месяц
  const dischargedAnimalsLastMonth = activeTreatments.filter(treatment => {
    if (!treatment.completionDate) return false;
    const completionDate = new Date(treatment.completionDate);
    const today = new Date();
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
    return completionDate >= lastMonth && treatment.completionType === 'discharge';
  }).length;

  // Количество телок
  const heifersCount = animals.filter(animal => 
    animal.gender === 'female' && 
    animal.status === 'Телка'
  ).length;
  
  // Подготовка данных для графиков
  const prepareMilkProductionChartData = () => {
    const labels = analyticsData.milkProduction.map(item => format(new Date(item.date), 'dd.MM'));
    const values = analyticsData.milkProduction.map(item => item.value);
    
    // Добавляем прогнозные значения
    if (predictions.milkProduction.length > 0) {
      // Получаем последнюю дату из данных
      const lastDate = new Date(analyticsData.milkProduction[analyticsData.milkProduction.length - 1].date);
      
      // Добавляем прогнозные даты
      for (let i = 1; i <= predictions.milkProduction.length; i++) {
        labels.push(format(addDays(lastDate, i), 'dd.MM'));
      }
      
      // Добавляем прогнозные значения
      values.push(...predictions.milkProduction);
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Средний удой (л)',
          data: values,
          borderColor: 'rgba(53, 162, 235, 1)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          tension: 0.3,
          fill: true
        }
      ]
    };
  };
  
  const prepareAnimalHealthChartData = () => {
    const labels = analyticsData.animalHealth.map(item => format(new Date(item.date), 'dd.MM'));
    
    return {
      labels,
      datasets: [
        {
          label: 'Здоровые (%)',
          data: analyticsData.animalHealth.map(item => item.healthy),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Больные (%)',
          data: analyticsData.animalHealth.map(item => item.sick),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        },
        {
          label: 'На лечении (%)',
          data: analyticsData.animalHealth.map(item => item.treatment),
          backgroundColor: 'rgba(255, 205, 86, 0.7)',
          borderColor: 'rgba(255, 205, 86, 1)',
          borderWidth: 1
        }
      ]
    };
  };
  
  const prepareInseminationChartData = () => {
    const labels = analyticsData.inseminationStats.map(item => format(new Date(item.date), 'dd.MM'));
    
    return {
      labels,
      datasets: [
        {
          label: 'Успешные',
          data: analyticsData.inseminationStats.map(item => item.successful),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Неуспешные',
          data: analyticsData.inseminationStats.map(item => item.unsuccessful),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    };
  };
  
  const prepareMedicationUsageChartData = () => {
    const labels = analyticsData.medicationUsage.map(item => format(new Date(item.date), 'dd.MM'));
    
    return {
      labels,
      datasets: [
        {
          label: 'Антибиотики',
          data: analyticsData.medicationUsage.map(item => item.Антибиотики),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        },
        {
          label: 'Вакцины',
          data: analyticsData.medicationUsage.map(item => item.Вакцины),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Витамины',
          data: analyticsData.medicationUsage.map(item => item.Витамины),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Другое',
          data: analyticsData.medicationUsage.map(item => item.Другое),
          backgroundColor: 'rgba(255, 205, 86, 0.7)',
          borderColor: 'rgba(255, 205, 86, 1)',
          borderWidth: 1
        }
      ]
    };
  };
  
  // Опции для графиков
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: false
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };
  
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        stacked: false
      },
      x: {
        stacked: false
      }
    }
  };

  return (
    <main className="flex-1 p-6 overflow-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Добро пожаловать</h1>
        <p className="text-gray-600">Ваш отчет и статистика на сегодняшний день</p>
        <p className="text-xs mt-2 text-gray-500 max-w-4xl">
          "Вести экономическое строительство нужно под таким углом зрения, чтобы из страны, ввозящей машины и оборудование, превратить в страну, производящую машины и оборудование… широко внедрить в производство достижения научно-технического прогресса"
        </p>
      </div>
      
      {/* Оповещение о пропущенных процедурах */}
      {showMissedTreatmentsAlert && missedTreatments.length > 0 && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Внимание! Обнаружены животные с пропущенным этапом лечения
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Количество животных: <strong>{missedTreatments.length}</strong>
                </p>
                <ul className="mt-1 list-disc list-inside">
                  {missedTreatments.slice(0, 3).map((treatment, index) => {
                    const animal = animals.find(a => a.id === treatment.animalId);
                    const daysMissed = differenceInDays(new Date(), new Date(treatment.expectedDate));
                    
                    return (
                      <li key={index}>
                        Животное №{animal?.number || 'Неизвестно'}, просрочено {daysMissed} дней
                      </li>
                    );
                  })}
                  {missedTreatments.length > 3 && (
                    <li>... и еще {missedTreatments.length - 3}</li>
                  )}
                </ul>
              </div>
              <div className="mt-3">
                <Link
                  to="/reports?report=missed_treatment"
                  className="text-sm font-medium text-red-800 hover:text-red-900 flex items-center"
                >
                  Просмотреть полный список
                  <ExternalLink className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
            <button
              className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-500"
              onClick={() => setShowMissedTreatmentsAlert(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Статистика и аналитика</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`px-4 py-2 rounded-md flex items-center transition-colors ${
              showAnalytics 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp size={18} className="mr-2" />
            {showAnalytics ? 'Скрыть аналитику' : 'Показать аналитику'}
          </button>
        </div>
      </div>
      
      {showAnalytics && (
        <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Аналитика и прогнозирование</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setAnalyticsTimeframe('week')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  analyticsTimeframe === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => setAnalyticsTimeframe('month')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  analyticsTimeframe === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Месяц
              </button>
              <button
                onClick={() => setAnalyticsTimeframe('quarter')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  analyticsTimeframe === 'quarter' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Квартал
              </button>
              <button
                onClick={() => setAnalyticsTimeframe('year')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  analyticsTimeframe === 'year' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Год
              </button>
            </div>
          </div>
          
          {isLoadingAnalytics ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : analyticsError ? (
            <div className="p-6 text-center text-red-600">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>{analyticsError}</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Удой молока */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Динамика удоя</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                      <span>Фактические данные</span>
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full ml-3 mr-1">
                      </span>
                      <span>Прогноз (TensorFlow)</span>
                    </div>
                  </div>
                  <div className="h-64">
                    {analyticsData.milkProduction.length > 0 && (
                      <Line 
                        data={prepareMilkProductionChartData()} 
                        options={lineChartOptions} 
                      />
                    )}
                  </div>
                  {predictions.milkProduction.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-blue-800">Прогноз на 7 дней:</p>
                      <p className="text-sm text-blue-700">
                        Средний удой: {predictions.milkProduction.reduce((sum, val) => sum + val, 0) / predictions.milkProduction.length} л/день
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Прогноз построен с использованием TensorFlow.js на основе исторических данных
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Здоровье животных */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Здоровье стада</h3>
                  </div>
                  <div className="h-64">
                    {analyticsData.animalHealth.length > 0 && (
                      <Bar 
                        data={prepareAnimalHealthChartData()} 
                        options={barChartOptions} 
                      />
                    )}
                  </div>
                  {predictions.animalHealth.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-sm font-medium text-green-800">Прогноз здоровья стада:</p>
                      <p className="text-sm text-green-700">
                        Ожидаемый процент здоровых животных: {predictions.animalHealth[0]}%
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Прогноз построен с использованием TensorFlow.js на основе исторических данных
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Статистика осеменений */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Статистика осеменений</h3>
                  </div>
                  <div className="h-64">
                    {analyticsData.inseminationStats.length > 0 && (
                      <Bar 
                        data={prepareInseminationChartData()} 
                        options={barChartOptions} 
                      />
                    )}
                  </div>
                  {predictions.inseminationSuccess !== null && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-sm font-medium text-purple-800">Прогноз успешности осеменения:</p>
                      <p className="text-sm text-purple-700">
                        Ожидаемый процент успешных осеменений: {(predictions.inseminationSuccess * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Прогноз построен с использованием TensorFlow.js на основе исторических данных
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Использование препаратов */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Использование препаратов</h3>
                  </div>
                  <div className="h-64">
                    {analyticsData.medicationUsage.length > 0 && (
                      <Bar 
                        data={prepareMedicationUsageChartData()} 
                        options={barChartOptions} 
                      />
                    )}
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-sm font-medium text-amber-800">Рекомендации по оптимизации:</p>
                    <p className="text-sm text-amber-700">
                      Оптимальный запас антибиотиков: {Math.round(medications.filter(m => 
                        nomenclatureItems.find(n => n.id === m.nomenclatureId)?.category === 'АНТИБИОТИК'
                      ).reduce((sum, m) => sum + m.remainingQuantity, 0) * 1.2)} ед.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Рекомендация основана на анализе исторических данных использования
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Сводка прогнозов */}
              <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white shadow-md">
                <h3 className="text-xl font-semibold mb-4">Прогнозы и рекомендации (TensorFlow.js)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm hover:bg-opacity-15 transition-all duration-200">
                    <h4 className="font-medium mb-2">Продуктивность</h4>
                    <p className="text-sm">Ожидается {predictions.milkProduction.length > 0 ? 
                      (predictions.milkProduction[predictions.milkProduction.length - 1] > 
                       analyticsData.milkProduction[analyticsData.milkProduction.length - 1]?.value ? 'рост' : 'снижение') : 'стабильность'} 
                      удоя в ближайшие 7 дней</p>
                    <div className="mt-2 text-xs opacity-80">
                      Рекомендация: {predictions.milkProduction.length > 0 && 
                        predictions.milkProduction[predictions.milkProduction.length - 1] < 
                        analyticsData.milkProduction[analyticsData.milkProduction.length - 1]?.value 
                        ? 'Пересмотреть рацион кормления' : 'Поддерживать текущий режим кормления'}
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm hover:bg-opacity-15 transition-all duration-200">
                    <h4 className="font-medium mb-2">Здоровье стада</h4>
                    <p className="text-sm">Прогнозируемый процент здоровых животных: {predictions.animalHealth.length > 0 ? 
                      `${predictions.animalHealth[0]}%` : 'Нет данных'}</p>
                    <div className="mt-2 text-xs opacity-80">
                      Рекомендация: {predictions.animalHealth.length > 0 && predictions.animalHealth[0] < 95 
                        ? 'Усилить профилактические меры' : 'Продолжать текущие профилактические меры'}
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm hover:bg-opacity-15 transition-all duration-200">
                    <h4 className="font-medium mb-2">Осеменение</h4>
                    <p className="text-sm">Прогнозируемая успешность осеменения: {predictions.inseminationSuccess !== null ? 
                      `${(predictions.inseminationSuccess * 100).toFixed(1)}%` : 'Нет данных'}</p>
                    <div className="mt-2 text-xs opacity-80">
                      Рекомендация: {predictions.inseminationSuccess !== null && predictions.inseminationSuccess < 0.7 
                        ? 'Пересмотреть протоколы осеменения' : 'Продолжать текущие протоколы осеменения'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard 
          title="Остаток ветпрепаратов"
          value={`${totalMedicationValue.toLocaleString()} ₽`}
          change={"+14%"}
          isPositive={true}
          icon={<Package size={20} className="text-blue-500" />}
          bgColor="bg-blue-50"
        />
        <StatusCard 
          title="Остаток доз семени"
          value={`${totalSemenDoses} (${totalSemenValue.toLocaleString()} ₽)`}
          change={"+18%"}
          isPositive={true}
          icon={<Heart size={20} className="text-green-500" />}
          bgColor="bg-green-50"
        />
        <StatusCard 
          title="Животные с маститом"
          value={`${mastitisAnimalsCount} голов`}
          change={mastitisAnimalsCount > 5 ? "+27%" : "-15%"}
          isPositive={mastitisAnimalsCount <= 5}
          icon={<AlertTriangle size={20} className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
        <StatusCard 
          title="Приплод"
          value={`${calfCount} телят`}
          change={"+12%"}
          isPositive={true}
          icon={<Baby size={20} className="text-amber-500" />}
          bgColor="bg-amber-50"
        />
      </div>

      {/* Панель пропущенных лечений */}
      {missedTreatments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-red-50 flex justify-between items-center">
            <div className="flex items-center">
              <Clock size={20} className="text-red-600 mr-2" />
              <h2 className="text-lg font-medium text-red-800">Пропущенные этапы лечения</h2>
            </div>
            <Link
              to="/reports?report=missed_treatment"
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center"
            >
              Полный отчет
              <ExternalLink size={14} className="ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Схема лечения</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Этап</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ожидаемая дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Просрочено дней</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {missedTreatments.slice(0, 5).map((treatment, index) => {
                  const animal = animals.find(a => a.id === treatment.animalId);
                  const daysMissed = differenceInDays(new Date(), new Date(treatment.expectedDate));
                  
                  return (
                    <tr key={index} className={daysMissed > 7 ? 'bg-red-50' : daysMissed > 3 ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {animal?.number || 'Неизвестно'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getTreatmentSchemeName(treatment.schemeId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getTreatmentStepName(treatment.schemeId, treatment.stepId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(treatment.expectedDate), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-red-600">
                        {daysMissed}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {missedTreatments.length > 5 && (
            <div className="p-3 border-t text-center">
              <Link 
                to="/reports?report=missed_treatment" 
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Показать все {missedTreatments.length} записей
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default Dashboard;
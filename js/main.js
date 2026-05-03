let lifeData = null;
let countdownInterval = null;
let animationInterval = null;
let currentDayIndex = 0;
let tooltip = null;

const LIFE_EXPECTANCY = {
  male: 68.04,
  female: 78.74
};

async function loadRandomQuote() {
  try {
    const response = await fetch('js/quotes.json');
    const quotes = await response.json();
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quote').textContent = `"${quote}"`;
  } catch (error) {
    console.error('Ошибка загрузки цитаты:', error);
    document.getElementById('quote').textContent = '"Время — это единственное, что нельзя вернуть."';
  }
}

function calculateLifeGrid(birthDateString, gender) {
  const today = new Date();
  // Парсим дату как локальную, а не UTC
  const [year, month, day] = birthDateString.split('-').map(Number);
  const birth = new Date(year, month - 1, day); // month - 1!

  if (birth >= today) throw new Error('Дата рождения не может быть сегодня или в будущем.');

  const lifeExpectancyYears = LIFE_EXPECTANCY[gender];
  const totalDays = Math.floor(lifeExpectancyYears * 365.25);
  const livedDays = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
  const todayIndex = livedDays;

  const endDate = new Date(birth);
  endDate.setFullYear(birth.getFullYear() + Math.floor(lifeExpectancyYears));
  endDate.setDate(endDate.getDate() + Math.round((lifeExpectancyYears % 1) * 365.25));

  return { 
    totalDays, 
    livedDaysInitial: livedDays, 
    todayIndex, 
    endDate,
    birthDate: birthDateString,
    birthDateObj: birth
  };
}

function drawCell(ctx, col, row, color, cellSize, gap) {
  const x = col * (cellSize + gap);
  const y = row * (cellSize + gap);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, cellSize, cellSize);
}

function createTooltip() {
  if (tooltip) return tooltip;
  tooltip = document.createElement('div');
  tooltip.style.position = 'fixed';
  tooltip.style.background = 'rgba(0,0,0,0.85)';
  tooltip.style.color = 'white';
  tooltip.style.padding = '6px 10px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.fontSize = '13px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.zIndex = '2000';
  tooltip.style.opacity = '0';
  tooltip.style.transition = 'opacity 0.2s';
  document.body.appendChild(tooltip);
  return tooltip;
}

function formatDate(date) {
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('ru-RU', options);
}

function formatTodayDate() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function positionTodayBadge(canvas, todayIndex, cols, totalCell) {
  if (todayIndex < 0) return;
  const row = Math.floor(todayIndex / cols);
  const col = todayIndex % cols;
  const x = col * totalCell + totalCell / 2;
  const y = row * totalCell;
  const badge = document.getElementById('todayBadge');
  badge.style.left = x + 'px';
  badge.style.top = (y - 20) + 'px';
  badge.classList.remove('hidden');
}

function animateLifeGrid(canvas, data) {
  const ctx = canvas.getContext('2d');
  const { totalDays, livedDaysInitial, todayIndex, birthDateObj } = data;

  const containerWidth = window.innerWidth;
  const cellSize = Math.min(16, Math.max(10, containerWidth / 120));
  const gap = 2;
  const totalCell = cellSize + gap;
  const cols = Math.floor(containerWidth / totalCell);
  const rows = Math.ceil(totalDays / cols);

  canvas.width = containerWidth;
  canvas.height = rows * totalCell;

  const FUTURE = '#e8f5e9';
  const TODAY = '#1b5e20';
  const PAST = '#424242';

  for (let i = 0; i < totalDays; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    drawCell(ctx, col, row, FUTURE, cellSize, gap);
  }

  if (todayIndex < totalDays) {
    const todayRow = Math.floor(todayIndex / cols);
    const todayCol = todayIndex % cols;
    drawCell(ctx, todayCol, todayRow, TODAY, cellSize, gap);
  }

  // Позиционируем иконку сегодня
  if (todayIndex >= 0 && todayIndex < totalDays) {
    positionTodayBadge(canvas, todayIndex, cols, totalCell);
  }

  // Позиционируем фразу над будущим
  const futureStartIndex = livedDaysInitial;
  if (futureStartIndex < totalDays) {
    const row = Math.floor(futureStartIndex / cols);
    const y = row * totalCell + 40;
    const msg = document.getElementById('futureMessage');
    msg.style.top = y + 'px';
    msg.classList.remove('hidden');
  }

  // Анимация
  let daysToAnimateFast = livedDaysInitial - 30;
  if (daysToAnimateFast < 0) daysToAnimateFast = 0;

  let fastIndex = 0;

  if (daysToAnimateFast > 0) {
    const totalFastDuration = 5000;
    const intervalDelay = Math.max(5, totalFastDuration / daysToAnimateFast);

    const fastInterval = setInterval(() => {
      if (fastIndex >= daysToAnimateFast) {
        clearInterval(fastInterval);
        currentDayIndex = fastIndex;
        startSlowAnimation();
        return;
      }

      if (fastIndex === todayIndex) {
        fastIndex++;
      }

      const row = Math.floor(fastIndex / cols);
      const col = fastIndex % cols;
      drawCell(ctx, col, row, PAST, cellSize, gap);
      updateStats(fastIndex + 1, totalDays);

      if (fastIndex % 50 === 0) {
        const targetTop = document.getElementById('gridContainer').offsetTop + row * totalCell - window.innerHeight / 2;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }

      fastIndex++;
    }, intervalDelay);
  } else {
    currentDayIndex = 0;
    startSlowAnimation();
  }

  function startSlowAnimation() {
    animationInterval = setInterval(() => {
      if (currentDayIndex >= livedDaysInitial || currentDayIndex >= totalDays) {
        clearInterval(animationInterval);
        startRealTimeAnimation();
        return;
      }

      if (currentDayIndex !== todayIndex) {
        const row = Math.floor(currentDayIndex / cols);
        const col = currentDayIndex % cols;
        drawCell(ctx, col, row, PAST, cellSize, gap);
      }

      updateStats(currentDayIndex + 1, totalDays);
      const row = Math.floor(currentDayIndex / cols);
      const targetTop = document.getElementById('gridContainer').offsetTop + row * totalCell - window.innerHeight / 3;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });

      currentDayIndex++;
    }, 1000);
  }

  function startRealTimeAnimation() {
    animationInterval = setInterval(() => {
      const now = new Date();
      if (now >= data.endDate) {
        clearInterval(animationInterval);
        return;
      }

      const livedNow = Math.floor((now - birthDateObj) / (1000 * 60 * 60 * 24));
      if (livedNow > currentDayIndex && livedNow < totalDays) {
        if (currentDayIndex === todayIndex) {
          currentDayIndex = livedNow;
          return;
        }

        const row = Math.floor(currentDayIndex / cols);
        const col = currentDayIndex % cols;
        drawCell(ctx, col, row, PAST, cellSize, gap);
        currentDayIndex = livedNow;
        updateStats(livedNow, totalDays);
        const targetTop = document.getElementById('gridContainer').offsetTop + row * totalCell - window.innerHeight / 3;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }, 1000);
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / totalCell);
    const row = Math.floor(y / totalCell);
    const index = row * cols + col;

    if (index < 0 || index >= totalDays) {
      if (tooltip) tooltip.style.opacity = '0';
      return;
    }

    let message;
    if (index === 0) {
      message = "В этот день ты родился";
    } else if (index < livedDaysInitial) {
      message = "В этот день с тобой что-то происходило";
    } else {
      message = "Тебе решать, как пройдёт этот день: ";
    }

    const dayDate = new Date(birthDateObj);
    dayDate.setDate(dayDate.getDate() + index);
    const fullMessage = `${message}\n${formatDate(dayDate)}`;

    const t = createTooltip();
    t.textContent = fullMessage;

    const tooltipRect = t.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 200;
    const tooltipHeight = tooltipRect.height || 50;

    let left = e.clientX + 10;
    let top = e.clientY + 10;

    if (e.clientX + tooltipWidth + 20 > window.innerWidth) {
      left = e.clientX - tooltipWidth - 10;
    }
    if (e.clientY + tooltipHeight + 20 > window.innerHeight) {
      top = e.clientY - tooltipHeight - 10;
    }
    if (left < 5) left = 5;
    if (top < 5) top = 5;

    t.style.left = left + 'px';
    t.style.top = top + 'px';
    t.style.opacity = '1';
  });

  canvas.addEventListener('mouseleave', () => {
    if (tooltip) tooltip.style.opacity = '0';
  });
}

function updateStats(lived, total) {
  const remaining = Math.max(0, total - lived);
  
  // Только нижний счётчик
  document.getElementById('bottom-lived').textContent = lived.toLocaleString('ru-RU');
  document.getElementById('bottom-remaining').textContent = remaining.toLocaleString('ru-RU');
  document.getElementById('bottomCounter').classList.remove('hidden');

  // Обратный отсчёт — тоже только внизу
  if (countdownInterval) clearInterval(countdownInterval);
  const endDate = lifeData.endDate;
  countdownInterval = setInterval(() => {
    const now = new Date();
    const diff = endDate - now;
    if (diff <= 0) {
      clearInterval(countdownInterval);
      return;
    }

    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('cd-years').textContent = years;
    document.getElementById('cd-months').textContent = months;
    document.getElementById('cd-days').textContent = days;
    document.getElementById('cd-hours').textContent = hours;
    document.getElementById('cd-minutes').textContent = minutes;
    document.getElementById('cd-seconds').textContent = seconds;
  }, 1000);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadRandomQuote();
  document.getElementById('todayBadge').textContent = formatTodayDate();

  const form = document.getElementById('lifeForm');
  const inputSection = document.getElementById('inputSection');
  const resultSection = document.getElementById('resultSection');
  const actionsEl = document.getElementById('actions');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const birthDate = document.getElementById('birthdate').value;
    const genderEl = document.querySelector('input[name="gender"]:checked');
    if (!genderEl) {
      alert('Выберите пол');
      return;
    }
    const gender = genderEl.value;

    try {
      lifeData = calculateLifeGrid(birthDate, gender);
      animateLifeGrid(document.getElementById('lifeGrid'), lifeData);

      const timer = document.getElementById('fixedTimer');
      timer.classList.remove('hidden');
      setTimeout(() => timer.classList.add('visible'), 10);

      inputSection.style.display = 'none'; // скрыть навсегда
      resultSection.classList.remove('hidden');
      actionsEl.classList.remove('hidden');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('toggleFormBtn').addEventListener('click', () => {
    inputSection.style.display = 'block';
    inputSection.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('pdfBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const canvas = document.getElementById('lifeGrid');
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'px', [canvas.width, canvas.height]);
    pdf.addImage(img, 'PNG', 0, 0);
    pdf.save('сетка-жизни.pdf');
  });

  document.getElementById('shareBtn').addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: 'Сетка жизни', text: 'Посмотри мою сетку жизни!' });
    } else {
      alert('Поделиться можно через меню браузера.');
    }
  });

  // === МОДАЛЬНОЕ ОКНО ПОМОЩИ ===
  const helpButton = document.getElementById('helpButton');
  const helpModal = document.getElementById('helpModal');
  const closeButton = helpModal.querySelector('.close-button');

  if (helpButton && helpModal && closeButton) {
    helpButton.addEventListener('click', (e) => {
      e.preventDefault();
      helpModal.classList.add('open');
      document.body.style.overflow = 'hidden'; // отключить прокрутку
    });

    closeButton.addEventListener('click', () => {
      helpModal.classList.remove('open');
      document.body.style.overflow = '';
    });

    // Закрытие по клику на оверлей
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });

    // Закрытие по клавише Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && helpModal.classList.contains('open')) {
        helpModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

});
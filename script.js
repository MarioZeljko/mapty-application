'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat , lng]
    this.distance = distance; //in km
    this.duration = duration; //in hrs
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

/* const run1 = new Running([39, -17], 20, 55, 178);
const cycle1 = new Running([39, -17], 35, 75, 218); */

//App architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #workuot;
  closeBtn;

  constructor() {
    //Get user position
    this._getPosition();

    //Get local storage
    this._getLocalStorage();

    //Event Handlers
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._openModal.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapE;
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //Get data from form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //If workout running, create new running object

    if (type === 'running') {
      const cadence = +inputCadence.value;

      //Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Values have to be positive numbers!');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout cycling, create new cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      //Check if data is valid

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Values have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    console.log(this.#workouts);
    //Add new object to workout array
    this.#workouts.push(workout);
    //Render workout on map as marker

    this._renderWorkoutMarker(workout);

    //Render workout on list

    this._renderWorkout(workout);

    //Hide form + Clear input fields

    this._hideForm();

    //Set Local Storage

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(workout.description)
      .openPopup();
  }

  _renderWorkout(workout) {
    if (workout.edited) {
      const editedWorkoutIndex = this.#workouts.findIndex(
        w => w.id === workout.id
      );

      this.#workouts.splice(editedWorkoutIndex, 1);

      console.log(editedWorkoutIndex);
    }

    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="modal hidden">
    <button class="btn--close-modal">&times;</button>
    <button class="btn--edit-workout">Edit workout</button>
    </div>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="dots"> 
    <button class="dots__dot"></button>
    <button class="dots__dot"></button>
    <button class="dots__dot"></button>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `
    
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    
    `;

    if (workout.type === 'cycling')
      html += `

      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>

`;

    form.insertAdjacentHTML('afterend', html);

    const closeBtn = document.querySelector('.btn--close-modal');
    closeBtn.addEventListener('click', this._closeModal);

    const btnEditWorkout = document.querySelector('.btn--edit-workout');
    btnEditWorkout.addEventListener('click', this._editWorkout.bind(this));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data.map(entry => {
      if (entry.type === 'running') {
        return new Running(
          entry.coords,
          entry.distance,
          entry.duration,
          entry.cadence
        );
      }

      if (entry.type === 'cycling') {
        return new Cycling(
          entry.coords,
          entry.distance,
          entry.duration,
          entry.elevationGain
        );
      }
    });

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');

    location.reload();
  }

  _openModal(e) {
    const dots = e.target.closest('.dots');

    if (!dots) return;
    const modalWindow = e.target.closest('.workout').querySelector('.modal');
    modalWindow.classList.remove('hidden');
  }

  _closeModal(e) {
    const modalWindow = e.target.closest('.modal');

    if (!modalWindow) return;

    if (!modalWindow.classList.contains('hidden'))
      modalWindow.classList.add('hidden');
  }

  _editWorkout(e) {
    const editedWorkoutEl = e.target.closest('.workout');
    const editedWorkoutId = editedWorkoutEl.dataset.id;
    const editedWorkout = this.#workouts.find(w => w.id === editedWorkoutId);

    this.#workouts.forEach(w => {
      if (w.id === editedWorkoutId) {
        w.edited = true;
      } else return;
    });

    //Show the input form for a new workout
    this._showForm(this.#mapEvent);
  }
}

const app = new App();

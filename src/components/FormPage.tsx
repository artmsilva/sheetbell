import React, { useEffect, useReducer } from "react";
import confetti from "canvas-confetti";

function randomWord() {
  const words = [
    "apple",
    "banana",
    "cherry",
    "date",
    "elderberry",
    "fig",
    "grape",
    "honeydew",
    "imbe",
    "jackfruit",
    "kiwi",
    "lemon",
  ];

  return words[Math.floor(Math.random() * words.length)];
}

// Form state machine constants
const formStates = {
  IDLE: "idle",
  SUBMITTING: "submitting",
  SUCCESS: "success",
  ERROR: "error",
  CELEBRATING: "celebrating",
};

const formActions = {
  CHANGE: "change",
  SUBMIT: "submit",
  SUCCESS: "success",
  ERROR: "error",
  RESET: "reset",
  CELEBRATION_DONE: "celebration_done",
};

// Reducer for form state management
const formReducer = (state, action) => {
  switch (action.type) {
    case formActions.CHANGE:
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value,
        },
      };

    case formActions.SUBMIT:
      return {
        ...state,
        status: formStates.SUBMITTING,
        previousData: { ...state.formData },
      };

    case formActions.SUCCESS:
      return {
        ...state,
        status: formStates.CELEBRATING,
        formData: {
          contact: "",
          organizer: "",
          date: new Date().toISOString().split("T")[0],
          message: "",
        },
      };

    case formActions.ERROR:
      return {
        ...state,
        status: formStates.ERROR,
        error: action.error,
        formData: state.previousData || state.formData,
      };

    case formActions.RESET:
      return {
        ...state,
        status: formStates.IDLE,
        error: null,
      };

    case formActions.CELEBRATION_DONE:
      return {
        ...state,
        status: formStates.SUCCESS,
      };

    default:
      return state;
  }
};

const FormPage = () => {
  // Use Astro.env for environment detection and variables
  // See: https://docs.astro.build/en/guides/environment-variables/
  // Astro.env.MODE is 'development' or 'production'

  const initialFormData =
    import.meta.env.MODE === "production"
      ? {
          contact: "",
          organizer: "",
          date: new Date().toISOString().split("T")[0],
          message: "",
        }
      : {
          contact: "John Doe",
          organizer: "Jane Doe",
          date: new Date().toISOString().split("T")[0],
          message: `${randomWord()} - ${new Date().toISOString()}`,
        };

  const [state, dispatch] = useReducer(formReducer, {
    status: formStates.IDLE,
    formData: initialFormData,
    previousData: null,
    error: null,
  });

  // Auto-clear status messages after delay
  useEffect(() => {
    let timer;
    if (state.status === formStates.SUCCESS) {
      timer = setTimeout(() => {
        dispatch({ type: formActions.RESET });
      }, 1500); // Reduced from 3000ms to 1500ms
    }
    return () => clearTimeout(timer);
  }, [state.status]);

  // Celebration effect
  useEffect(() => {
    if (state.status === formStates.CELEBRATING) {
      // Trigger confetti animation
      const duration = 3000; // Increased from 1000ms to 3000ms
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 100,
      };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          dispatch({ type: formActions.CELEBRATION_DONE });
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Confetti from both sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [state.status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch({
      type: formActions.CHANGE,
      field: name,
      value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Start submission process
    dispatch({ type: formActions.SUBMIT });

    console.log("Submitting form data:", state.formData);

    fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(state.formData),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Server responded with an error");
        }
        dispatch({ type: formActions.SUCCESS });
      })
      .catch((err) => {
        console.error(err);
        dispatch({
          type: formActions.ERROR,
          error: "There was an error submitting the form. Please try again.",
        });
      });
  };

  return (
    <main className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-gray-900 min-h-screen">
      {state.status !== formStates.IDLE &&
        state.status !== formStates.CELEBRATING && (
          <div
            role="alert"
            aria-live="assertive"
            className={`mb-6 md:mb-8 p-3 rounded-md text-white text-center max-w-xl mx-auto ${
              state.status === formStates.ERROR
                ? "bg-red-600"
                : state.status === formStates.SUCCESS
                ? "bg-green-600"
                : "bg-blue-600"
            } transition-opacity duration-300 ease-in-out`}
          >
            {state.status === formStates.ERROR
              ? state.error
              : state.status === formStates.SUCCESS
              ? "Your form was successfully submitted."
              : "Submitting your form..."}
          </div>
        )}

      {/* Celebration message */}
      {state.status === formStates.CELEBRATING && (
        <div className="celebration-message mb-6 md:mb-8 p-4 rounded-md text-white text-center max-w-xl mx-auto bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 animate-pulse">
          <h2 className="text-xl font-bold animate-bounce">
            Submission Successful! 🎉
          </h2>
          <p>Thank you for recording your conversation!</p>
        </div>
      )}

      <h1
        id="form-title"
        className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8 text-white text-center"
      >
        Record a conversation
      </h1>

      <form
        onSubmit={handleSubmit}
        aria-labelledby="form-title"
        className="space-y-6 md:space-y-8 max-w-2xl mx-auto"
      >
        <fieldset className="border border-gray-700 rounded-md p-4 md:p-6">
          <legend className="text-lg font-medium px-2 text-gray-300">
            Conversation details
          </legend>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4">
            {/* Contact */}
            <div className="mb-4 md:mb-0">
              <label
                htmlFor="contact"
                className="block mb-1 font-medium text-gray-300"
              >
                Who was the conversation with?
              </label>
              <input
                required={true}
                type="text"
                id="contact"
                name="contact"
                value={state.formData.contact}
                onChange={handleChange}
                disabled={state.status === formStates.SUBMITTING}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white disabled:opacity-70"
              />
            </div>

            {/* Organizer */}
            <div className="mb-4 md:mb-0">
              <label
                htmlFor="organizer"
                className="block mb-1 font-medium text-gray-300"
              >
                Who led the conversation?
              </label>
              <input
                required={true}
                type="text"
                id="organizer"
                name="organizer"
                value={state.formData.organizer}
                onChange={handleChange}
                disabled={state.status === formStates.SUBMITTING}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white disabled:opacity-70"
              />
            </div>
          </div>

          {/* Date */}
          <div className="mb-4">
            <label
              htmlFor="date"
              className="block mb-1 font-medium text-gray-300"
            >
              When did this conversation take place?
            </label>
            <input
              id="date"
              required={true}
              name="date"
              type="date"
              value={state.formData.date}
              onChange={handleChange}
              disabled={state.status === formStates.SUBMITTING}
              className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white disabled:opacity-70"
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block mb-1 font-medium text-gray-300"
            >
              How did the conversation go?
            </label>
            <textarea
              required={true}
              id="message"
              name="message"
              rows={10}
              value={state.formData.message}
              onChange={handleChange}
              disabled={state.status === formStates.SUBMITTING}
              className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white disabled:opacity-70"
            />
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={state.status === formStates.SUBMITTING}
          className={`w-full md:w-1/2 lg:w-1/3 mx-auto flex justify-center py-2 md:py-3 px-4 border border-transparent rounded-md shadow-sm text-white cursor-pointer ${
            state.status === formStates.SUBMITTING
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          } font-medium transition-colors text-lg`}
        >
          {state.status === formStates.SUBMITTING ? "Submitting..." : "Submit"}
        </button>
      </form>
    </main>
  );
};

export default FormPage;

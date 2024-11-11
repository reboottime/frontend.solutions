## README

the Prompt provide to claude is as below


(context): I will have a 30 minutes coding challenge , as a Sr ~ Staff Level frontend Engineer.

<tech_stack>
The code challenge tech stack are as below:

- JavaScript
- React
- Window.fetch ( for API interaction)

<tech_stack>

<interview_goal>
The interview goal is to demonstrate I can write functional React  code real quickly, in the meanwhile has the SR~Staff Level capabilities.

</interview_goal>
In the following conversation  thread, I will provide you with the challenge requirements and expect you to generate react code for me to save time on writing.

<code_preference>
I expect the output code

- break components clearly
- have accessibilities support

Not provide any css styles.

</code_preference>

<problem_solving_style>
 The preferred working style: I need you to think step by step, and

- first break the big task into smaller one
- design and build component for each small task
- compose and organize the smaller task into solution

</<problem_solving_style>

The example about generating API related react state

<sample_code>
import { useCallback, useState, useRef } from "react";

/**
 * Constant states for API operation
 */
const API_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

export default function ActivitiesList() {
  const [apiStatus, setApiStatus] = useState(API_STATUS.IDLE);
  const [apiError, setApiError] = useState(null);
  const [apiData, setApiData] = useState(null);
  const [filterCriteria, setFilterCriteria] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const abortControllerRef = useRef(null);

  const fetchApiData = useCallback(async (criteria, page) => {
    setApiStatus(API_STATUS.LOADING);
    setApiError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch("API_PATH_WITH_QUERY_PARAMS", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch activities: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setApiData(data);
      setApiStatus(API_STATUS.SUCCESS);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setApiError(error);
        setApiStatus(API_STATUS.ERROR);
      }
    } finally {
      if (abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  return (
    <section aria-live="polite">
      <h1>Activities List</h1>
      
      {apiStatus === API_STATUS.LOADING && (
        <div role="status" aria-busy="true">
          <span style={{ 
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0'
          }}>
            Loading activities...
          </span>
          <p aria-hidden="true">Loading...</p>
        </div>
      )}

      {apiStatus === API_STATUS.ERROR && (
        <div role="alert">
          <p>{apiError?.message || "An unknown error occurred"}</p>
        </div>
      )}

      {apiStatus === API_STATUS.SUCCESS && apiData && (
        <div>
          {/* Add your activities rendering logic here */}
        </div>
      )}
    </section>
  );
}
</sample_code>

(Objective):  You will work as a Staff Frontend Engineer and React Expert and generate first draft solution that match my requirements.

Please be aware the code naming style I preferred in the sample code I shared with you in the context


(Response): respond the code in the code panel with preview effect and code comment
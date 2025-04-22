import React, { useEffect, useState } from "react";
import { Column, Grid, ComboBox, Button, Checkbox, DatePickerSkeleton, DatePicker, DatePickerInput, RadioButton, RadioButtonGroup, Tag, Dropdown, CodeSnippet, Tooltip } from "@carbon/react";
import "./_EvaluationComparison.scss";
import { format, isValid, parse } from "date-fns";
import { FlashFilled, Help } from "@carbon/react/icons";
import { se } from "date-fns/locale";


// GitHub configuration
const GITHUB_USERNAME = "IBM-OSS-Support";
const REPO_BRANCH = "gh-pages";
const GITHUB_INDEX_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/IBM-Code-Assist-Web-UI/${REPO_BRANCH}/code-assist-webUI/code-assist-web/src/prompt-results/index.json`;
const GITHUB_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/IBM-Code-Assist-Web-UI/${REPO_BRANCH}/code-assist-webUI/code-assist-web/src`;

interface Model {
    name: string;
    created_at: string;
    file_name: string;
    total_time: string
    prompt: { user: string; assistant: string; }[];
}

const ModelComparison = () => {
    const [selectedGranite, setSelectedGranite] = useState<string | null>(null);
    const [selectedOther, setSelectedOther] = useState<string | null>(null);
    const [compareClicked, setCompareClicked] = useState<boolean>(false);
    const [solidBackgrounds, setSolidBackgrounds] = useState<{ [modelName: string]: boolean }>({});
    const [selectedQuestions, setSelectedQuestions] = useState<{ [modelName: string]: string }>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedDates, setSelectedDates] = useState<{ [modelName: string]: string | null }>({});
    const [modelsData, setModelsData] = useState<Model[]>([]);
    const [apiError, setApiError] = useState<string | null>(null);
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [allFileNames, setAllFileNames] = useState<string[]>([]);
    const [noResultsFound, setNoResultsFound] = useState<boolean>(false);
    const [serverIP, setServerIP] = useState("localhost");
    const [serverPort, setServerPort] = useState<number>(5005);
    const [filteredFileNames, setFilteredFileNames] = useState<string[]>([]);
    const [selectedResults, setSelectedResults] = useState<{ [key: string]: string }>({});
    const [codeAssistData, setCodeAssistData] = useState<any>(null);
    const [modelScores, setModelScores] = useState<{[key: string]: string}>({});
    const [usingGitHub, setUsingGitHub] = useState(false);
    const [fastestTime, setFastestTime] = useState<number | null>(null);
    const [filteredPrompts, setFilteredPrompts] = useState<{ [key: string]: any[] }>({});

    // Modified backend URL detection with GitHub fallback
    const getBackendURL = () => {
        if (window.location.hostname === "localhost") {
            return "http://localhost:5005";
        } else if (window.location.hostname === "ibm-oss-support.github.io") {
            setUsingGitHub(true);
            return (usingGitHub);
        } else {
            return "http://9.20.192.160:5005";
        }
    };

    // Unified data fetching
    useEffect(() => {
        const fetchDataSources = async () => {
            try {
                // Try GitHub first
                const githubResponse = await fetch(GITHUB_INDEX_URL);
                if (githubResponse.ok) {
                    const indexData = await githubResponse.json();
                    setAvailableFiles(Object.keys(indexData));
                    setUsingGitHub(true);
                    return;
                }
            } catch (githubError) {
                console.log('Falling back to local server');
            }
            
            // Fallback to local server
            try {
                const response = await fetch(`http://${serverIP}:${serverPort}/api/models`);
                if (!response.ok) throw new Error("Failed to fetch files");
                const files = await response.json();
                setAvailableFiles(files);
                setUsingGitHub(false);
            } catch (error) {
                console.error("Error fetching files:", error);
                setApiError("Failed to fetch available files from both GitHub and local server.");
            }
        };

        fetchDataSources();
    }, [serverIP, serverPort]);

    // Unified model data fetcher
    useEffect(() => {
        const fetchModelData = async () => {
            setIsLoading(true);
            setApiError(null);
            setNoResultsFound(false);
        
            // Helper: Extract the latest file for a model based on timestamp
            const getLatestFileName = (fileList: string[], modelName: string) => {
                const regex = new RegExp(`${modelName.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')}_([0-9]{8}T[0-9]{6})\\.json`);
                
                const sorted = fileList
                    .map(file => {
                        const match = file.match(regex);
                        if (!match) return null;
        
                        const timestamp = match[1];
                        const date = new Date(
                            Number(timestamp.slice(0, 4)),
                            Number(timestamp.slice(4, 6)) - 1,
                            Number(timestamp.slice(6, 8)),
                            Number(timestamp.slice(9, 11)),
                            Number(timestamp.slice(11, 13)),
                            Number(timestamp.slice(13, 15))
                        );
        
                        return { file, date };
                    })
                    .filter(Boolean)
                    .sort((a, b) => b!.date.getTime() - a!.date.getTime());
        
                return sorted.length > 0 ? sorted[0]!.file : null;
            };
        
            try {
                const responses = await Promise.all(
                    availableFiles.map(async modelName => {
                        try {
                            if (window.location.hostname === "ibm-oss-support.github.io") {
                                // GitHub mode
                                const indexResponse = await fetch(GITHUB_INDEX_URL);
                                const filesIndex: Record<string, string[]> = await indexResponse.json();
                            
                                const modelFiles = filesIndex[modelName];
                                if (!modelFiles || modelFiles.length === 0) {
                                    throw new Error(`No files found for model: ${modelName}`);
                                }

                                // Fetch ALL files for this model
                                const validFiles = modelFiles
                                    .filter(file => 
                                        typeof file === 'string' && 
                                        file.trim() !== '' && 
                                        file.endsWith('.json')
                                    )
                            
                                // Fetch all files instead of just the latest
                                const fileResponses = await Promise.all(
                                    validFiles.map(async fileName => {
                                        const fileUrl = `${GITHUB_BASE_URL}/prompt-results/${fileName}`;
                                        const response = await fetch(fileUrl);
                                        if (!response.ok) throw new Error(`Failed to fetch ${fileUrl}`);
                                        return response.json();
                                    })
                                );
                            
                                const allValidFiles = validFiles
                                    .map(file => file.split('/').pop() || file); // Extract only the file name

                                // Add all valid files to allFileNames
                                setAllFileNames(prev => [
                                    ...new Set([
                                        ...prev,
                                        ...allValidFiles
                                    ])
                                ]);
                            
                                return fileResponses;
                            } else {
                                // Local development mode
                                let fileNames = await fetch(`http://${serverIP}:${serverPort}/api/models/${modelName}/files`)
                                    .then(r => r.json())
                                    .then(files => files.filter((f: any) => typeof f === 'string' && f.trim() !== ''));
        
                                fileNames = fileNames.flat();
        
                                const fileResponses = await Promise.all(
                                    fileNames.map(async (fileName: string) => {
                                        return fetch(`http://${serverIP}:${serverPort}/api/models/${modelName}/files/${fileName}`)
                                            .then((r: Response) => r.json() as Promise<string[]>);
                                    })
                                );
        
                                setAllFileNames(prev => {
                                    const newFiles = fileNames
                                        .filter((f: string) => 
                                            typeof f === 'string' && 
                                            f.trim() !== '' && 
                                            !prev.includes(f)
                                        );
                                    return [...prev, ...newFiles];
                                });
                                console.log(`local All files for ${modelName}:`, allFileNames);
                                
                                return fileResponses.flat();
                            }
                        } catch (error) {
                            console.error(`Error fetching ${modelName} data:`, error);
                            return [];
                        }
                    })
                );
        
                const allModels = responses.flatMap(response =>
                    Object.values(response).flatMap(entry =>
                        Array.isArray(entry) ? entry : [entry]
                    )
                );
        
                setModelsData(allModels);
        
                if (usingGitHub) {
                    setAllFileNames(prev => [
                        ...new Set([
                            ...prev,
                            ...allModels.map(m => m.file_name)
                                .filter(f => typeof f === 'string' && f.trim() !== '')
                        ])
                    ]);
                }
        
            } catch (error) {
                console.error("Error fetching models:", error);
                setApiError("Failed to fetch models. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };               
        
    
        if (availableFiles.length > 0) {
            fetchModelData();
        }
    }, [availableFiles, serverIP, serverPort, selectedDates, usingGitHub]);


    // Prepare model lists
    const flattenedModels = modelsData.flatMap(item => Object.values(item).flat());

    const graniteModels = Array.from(new Set(
        flattenedModels
            .filter(model => model.name && model.name.toLowerCase().includes("granite"))
            .map(model => model.name)
    ));


    const otherModels = Array.from(new Set(
        flattenedModels
            .filter(model => model.name && !model.name.toLowerCase().includes("granite"))
            .map(model => model.name)
    ));

    console.log("Granite Models:", graniteModels);
    console.log("Other Models:", otherModels);


    // Add null/undefined checks and safe defaults
    const parseFileName = (fileName?: string) => {
        // Add fallback for undefined/empty filename
        if (!fileName || typeof fileName !== 'string') {
        return {
            modelName: 'Invalid Filename',
            timestamp: '00000000T000000',
            fullName: 'invalid_filename.json'
        };
        }
    
        const match = fileName.match(/^(.+?)_(\d{8}T\d{6})\.json$/);
        
        return match ? {
        modelName: match[1], // "granite3.1:8b"
        timestamp: match[2], // "20250302T101520"
        fullName: fileName
        } : {
        modelName: 'Invalid Format',
        timestamp: '00000000T000000',
        fullName: fileName
        };
    };
  
  const getModelBaseName = (fileName: string) => {
    const parts = fileName.split('_');
    if (parts.length < 2) return fileName;
    return parts[0].split(':')[0].replace(/\d+\.\d+/g, ''); // "granite"
  };
  
    // Updating getModelDetails function
    const getModelDetails = (name: string): { model: Model | undefined; modelJsonFiles: string[] } => {
        if (!modelsData || !Array.isArray(allFileNames) || allFileNames.length === 0) {
          return { model: undefined, modelJsonFiles: [] };
        }
      
        // Add null check for parsed files
        const modelJsonFiles = allFileNames
          .map(fileName => parseFileName(fileName))
          .filter((file): file is NonNullable<ReturnType<typeof parseFileName>> => !!file)
          .filter(file => {
            const baseName = getModelBaseName(file.modelName);
            return baseName.toLowerCase() === name.toLowerCase();
          })    
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
          .map(file => file.fullName);
      
        // Add fallback for undefined modelData
        const modelData = (flattenedModels.find(m => m?.name === name) || {}) as Model;
      
        return { 
          model: modelData.name ? modelData : undefined,
          modelJsonFiles 
        };
    };      
    
    // update filtered files when dates change
    useEffect(() => {
        const updateFilteredFiles = () => {
          const newFilteredFiles: string[] = [];
          [selectedGranite, selectedOther].forEach(modelName => {
            if (modelName && selectedDates[modelName]) {
              const filtered = allFileNames.filter(fileName => {
                const parsed = parseFileName(fileName);
                if (!parsed) return false;
                const fileDate = parsed.timestamp.substr(0, 8); // "20250302"
                return fileDate === selectedDates[modelName]?.replace(/-/g, '');
              });
              newFilteredFiles.push(...filtered);
            }
          });
          setFilteredFileNames(newFilteredFiles);
        };
      
        updateFilteredFiles();
      }, [selectedDates, selectedGranite, selectedOther, allFileNames]);

    // Add this after line 153 in your EvaluationComparison.tsx file
    const countFilesForModel = (modelName: string) => {
        if (!Array.isArray(allFileNames)) return 0;
        
        return allFileNames
            .filter(fileName => {
                // Validate filename before processing
                if (typeof fileName !== 'string' || fileName.trim() === '') {
                    return false;
                }
                
                const parts = fileName.split('_');
                return parts.length > 0 && parts[0] === modelName.split('_')[0];
            })
            .length;
    };

    // Cleanup effect to remove empty strings from allFileNames
    useEffect(() => {
        setAllFileNames(prev => 
            prev.filter(f => typeof f === 'string' && f.trim() !== '')
        );
    }, []);


    // Update the useEffect that processes the models to determine the fastest time
    useEffect(() => {
        if (modelsData.length > 0) {
            // Find the fastest model
            const times = modelsData
                .filter(model => model.total_time)
                .map(model => Number(model.total_time));
                
            if (times.length > 0) {
                const fastest = Math.min(...times);
                setFastestTime(fastest);
            }
        }
    }, [modelsData]);
    

    // To handle auto-selection of single results
    useEffect(() => {
        [selectedGranite, selectedOther].forEach(modelName => {
          if (!modelName) return;
          
          const { modelJsonFiles } = getModelDetails(modelName);
          const hasExistingSelection = !!selectedResults[modelName];
          
          // Only auto-select if:
          // - No existing selection
          // - Not in reset state (date is null)
          // - Files available
          if (!hasExistingSelection && selectedDates[modelName] && modelJsonFiles?.length === 1) {
            setSelectedResults(prev => ({
              ...prev,
              [modelName]: modelJsonFiles[0]
            }));
          }
        });
      }, [availableFiles, selectedDates]);
    
    console.log("availableFiles", availableFiles, "modelsData:", modelsData);
    console.log("Potentially problematic models:", modelsData.filter(model => !model.name));

    // for fetching pass@1 score fron code-assist-data.json file
    useEffect(() => {
        const fetchCodeAssistData = async () => {
            try {
                const backendURL = getBackendURL();
                const response = await fetch(`${GITHUB_BASE_URL}/code-assist-data.json`);
                const data = await response.json();
                setCodeAssistData(data);
                
                // Create score mapping
                const scores: {[key: string]: string} = {};
                Object.values(data).forEach((modelGroup: any) => {
                    modelGroup.forEach((model: any) => {
                        const validScores = model.Data.filter((d: any) => d["Pass@1"] && d["Pass@1"] !== "Not applicable")
                            .map((d: any) => parseFloat(d["Pass@1"]));
                        
                        if (validScores.length > 0) {
                            const averageScore = validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length;
                            const percentage = Math.min(Math.max(averageScore * 100, 0), 100);
                            scores[model.Name] = `${percentage.toFixed(1)}%`;
                        }
                    });
                });
                setModelScores(scores);
            } catch (error) {
                console.error("Error fetching code assist data:", error);
            }
        };

        fetchCodeAssistData();
    }, []);

    // To Recalculate filteredPrompts
    // useEffect(() => {
    //     const updateFilteredPrompts = () => {
    //         const updatedPrompts: { [key: string]: any[] } = {};
    
    //         Object.keys(selectedResults).forEach((modelName) => {
    //             const selectedFileName = selectedResults[modelName];
    //             const model = modelsData.flatMap((entry) =>
    //                 Object.values(entry).flat()
    //             ).find((m) =>
    //                 m.name && modelName &&
    //                 m.name.toLowerCase().trim() === modelName.toLowerCase().trim() &&
    //                 m.file_name === selectedFileName && selectedFileName
    //             );
    
    //             if (model && selectedFileName) {
    //                 const parsedFile = parseFileName(selectedFileName);
    //                 if (parsedFile) {
    //                     const prompts = model.prompt.filter((prompt: { user: string; assistant: string }) => {
    //                         const promptDate = parsedFile.timestamp.substring(0, 8); // Extract date from the selected file
    //                         const createdAtDate = model.created_at.substring(0, 8); // Extract date from the model's created_at
    //                         return promptDate === createdAtDate;
    //                     });
    
    //                     updatedPrompts[modelName] = prompts;
    //                 }
    //             }
    //         });
    
    //         setFilteredPrompts(updatedPrompts);
    //     };
    
    //     updateFilteredPrompts();
    // }, [selectedResults, modelsData]);

    const handleCompare = () => {
        if (selectedGranite && selectedOther) {
          setIsLoading(true);
          setTimeout(() => {
            setCompareClicked(true);
            setIsLoading(false);
          }, 2000);
        }
    };

    const handleClear = () => {
        setSelectedGranite(null);
        setSelectedOther(null);
        setCompareClicked(false);
        setSolidBackgrounds({});
        setSelectedQuestions({});
        setSelectedDates({});
        setNoResultsFound(false);
        setSelectedResults({});
    };

    const formatPromptWithCodeTags = (prompt: string): React.ReactNode => {
        // Remove <user> and <assistant> tags from the prompt
        const cleanedPrompt = prompt.replace(/<\/?(user|assistant)>/g, '');
        const regex = /```(.*?)```/gs;
        let lastIndex = 0;
        const parts: React.ReactNode[] = [];
    
        cleanedPrompt.replace(regex, (match, codeBlock, offset) => {
            // Add text before code block
            parts.push(
                cleanedPrompt.slice(lastIndex, offset).split("\n").map((line, index) => (
                    <React.Fragment key={`${offset}-text-${index}`}>
                        {line}
                        <br />
                    </React.Fragment>
                ))
            );
    
            // Add code block
            parts.push(
                // <code key={offset} style={{ 
                //     backgroundColor: "#101010", 
                //     padding: "2px 10px", 
                //     borderRadius: "4px", 
                //     display: "block", 
                //     wordBreak: "break-word",
                //     margin: "8px 0",
                //     overflowX: "auto",
                //     letterSpacing: "0.025em",
                //     WebkitOverflowScrolling: "touch"
                // }}>
                <CodeSnippet key={offset} type="multi" feedback="Copied to clipboard">
                    {codeBlock.split("\n").map((line: string, index: number) => (
                        <React.Fragment key={`${offset}-code-${index}`}>
                            <span>{line}</span>
                            <br />
                        </React.Fragment>
                    ))}
                </CodeSnippet>
                // </code>
            );
    
            lastIndex = offset + match.length;
            return match;
        });
    
        // Add remaining text after last code block
        parts.push(
            cleanedPrompt.slice(lastIndex).split("\n").map((line, index) => (
                <React.Fragment key={`end-text-${index}`}>
                    {line}
                    <div></div>
                </React.Fragment>
            ))
        );
    
        return <>{parts}</>;
    };

    return (
        <div className="evaluation-comparison-wrap">
            <Grid fullWidth narrow className="page-content">
                <Column sm={4} md={8} lg={16}>
                    <div className="heading-wrap">
                        <h3>Select Models for Comparison</h3>
                    </div>
                </Column>
                <Column sm={4} md={8} lg={16}>
                    <div className="compare-option-wrap">
                        {/* <RadioButtonGroup
                            legendText="Compare with:"
                            name="compare-option"
                            defaultSelected="other"
                            onChange={(value) => setCompareOption(value as string)}
                            disabled={isLoading}
                        >
                            <RadioButton labelText="Compare with Other AI Models" value="other" id="other-radio" />
                            <RadioButton labelText="Compare with Other Granite Models" value="granite" id="granite-radio" />
                        </RadioButtonGroup> */}
                        <Grid narrow>
                            <Column sm={4} md={4} lg={6}>
                                <ComboBox
                                    key={selectedGranite}
                                    id="granite-model-combo-box"
                                    items={[...graniteModels, ...otherModels]}  // Combine both lists
                                    itemToString={(item) => (item ? item : '')}
                                    onChange={({ selectedItem }) => setSelectedGranite(selectedItem as string)}
                                    selectedItem={selectedGranite} 
                                    titleText="Select First Model"
                                    placeholder="Choose any model"
                                    disabled={isLoading}
                                    shouldFilterItem={({ item, inputValue }) => 
                                        item.toLowerCase().includes(inputValue?.toLowerCase() || '')
                                    }
                                />
                            </Column>
                            <Column sm={4} md={4} lg={6}>
                                <ComboBox
                                    key={selectedOther}
                                    id="other-model-combo-box"
                                    items={[...graniteModels, ...otherModels]}  // Combine both lists
                                    itemToString={(item) => (item ? item : '')}
                                    onChange={({ selectedItem }) => setSelectedOther(selectedItem as string)}
                                    selectedItem={selectedOther} 
                                    titleText="Select Second Model"
                                    placeholder="Choose any model"
                                    disabled={isLoading}
                                    shouldFilterItem={({ item, inputValue }) => 
                                        item.toLowerCase().includes(inputValue?.toLowerCase() || '')
                                    }
                                />

                            </Column>
                            <Column sm={4} md={8} lg={4}>
                                <div style={{ marginTop: "1.6rem", display: "flex", gap: "0.8rem" }}>
                                    <Button onClick={handleCompare} disabled={!selectedGranite || !selectedOther || isLoading}>Compare</Button>
                                    <Button onClick={handleClear} kind="danger" disabled={!selectedGranite && !selectedOther || isLoading}>Clear</Button>
                                </div>
                            </Column>
                        </Grid>
                    </div>
                </Column>

                {isLoading && 
                    <Column sm={4} md={8} lg={16}>
                        <div className="skeleton-wrap" style={{ display: "flex", width: "300px", height: "560px", alignItems: "center", justifyContent: "center", margin: "4rem auto 0" }}>
                            <DatePickerSkeleton range />
                        </div>
                    </Column>
                }

                {apiError && 
                    <Column sm={4} md={8} lg={16}>
                        <div style={{ color: "red", textAlign: "center", marginTop: "20px" }}>
                            {apiError}
                        </div>
                    </Column>
                }

                {compareClicked && selectedGranite && selectedOther && !isLoading ? (
                    <Column sm={4} md={8} lg={16}>
                        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px" }}>
                            {[selectedGranite, selectedOther].map((modelName) => {
                                console.log("1.modelName:::>>", modelName);

                                const model = getModelDetails(modelName);

                                console.log("modelmodel::", model);

                                // const fastestTime = Math.min(
                                //     ...(model.model?.total_time !== undefined 
                                //       ? [Number(model.model.total_time)]
                                //       : [])
                                //   );

                               // Initialize fastestTime if it's not set or is greater than the current model's time
                                if (model?.model?.total_time && model.model?.total_time !== undefined) {
                                    const currentModelTime = Number(model.model.total_time);
                                    
                                    // Check if the current model time is a valid number
                                    if (!isNaN(currentModelTime) && (fastestTime === null || currentModelTime < fastestTime)) {
                                    setFastestTime(currentModelTime); // Update to the smallest time
                                    }
                                }
                                
                                // Check if current model is the fastest
                                const isFastest = model?.model?.total_time 
                                    ? Number(model.model.total_time) === fastestTime
                                    : false;

                                console.log(
                                    `model :: time: ${model?.model?.total_time}, isFastest: ${isFastest}`
                                );

                                if (model) {
                                    const numberOfFiles = countFilesForModel(model.model?.name || '');
                                    console.log(`countFilesForModel for ${model}: ${numberOfFiles}`);
                                }

                                if (!model) return null;
                                const questionNumbers = ["All"];
                                const selectedQuestion = model.model ? selectedQuestions[model.model.name] || "All" : "All";

                                if (model && model.model) {
                                    questionNumbers.push(...model.model.prompt.map((_, index) => `Question ${index + 1}`));
                                }

                                const filteredPrompts = modelsData
                                    .flatMap((entry) => Object.values(entry).flat())
                                    .filter((m) => m.name === model?.model?.name)
                                    .flatMap((m) => {
                                        const selectedFileName = selectedResults[model?.model?.name ?? ''];
                                        if (selectedFileName && m.file_name === selectedFileName) {
                                            // Ensure the selected file's model name matches the current model name
                                            const parsedFile = parseFileName(selectedFileName);
                                            if (parsedFile?.modelName === model?.model?.name) {
                                                return m.prompt || [];
                                            }
                                        }
                                        // If no result is selected, show the latest prompts
                                        if (!selectedFileName) {
                                            const latestFileName = model?.modelJsonFiles?.[model?.modelJsonFiles?.length - 1];
                                            if (latestFileName && m.file_name === latestFileName) {
                                                return m.prompt || [];
                                            }
                                        }
                                        return [];
                                    })
                                    .filter((prompt) => {
                                        const modelName = model?.model?.name ?? '';

                                        console.log("modelName:::", modelName, "modelJsonFiles", model?.modelJsonFiles);

                                        // If no date is selected for this model, show all prompts
                                        if (!selectedDates[modelName]) {
                                            return true;
                                        }

                                        const createdAtDate = model?.model?.created_at ? new Date(
                                            Number(model?.model?.created_at.substring(0, 4)),
                                            Number(model?.model?.created_at.substring(4, 6)) - 1,
                                            Number(model?.model?.created_at.substring(6, 8)),
                                            Number(model?.model?.created_at.substring(9, 11)),
                                            Number(model?.model?.created_at.substring(11, 13))
                                        ) : null;

                                        console.log(`filteredPrompts -- createdAtDate for ${model?.model?.name}:`, createdAtDate);

                                        if (!createdAtDate || isNaN(createdAtDate.getTime())) return false;

                                        const formattedDate = createdAtDate.toLocaleDateString('en-GB').split('/').reverse().join('-');  // Convert to DD-MM-YYYY

                                        console.log(`filteredPrompts -- formattedDate for ${model?.model?.name}:`, formattedDate, `selectedDates[modelName]:`, selectedDates[modelName]);

                                        const getModelName = (): string | undefined => {
                                            return model?.model?.name;
                                        };

                                        return formattedDate === selectedDates[getModelName() ?? '']; // Ensure date formats match
                                    });

                                // Store all selected files' prompts
                                const allSelectedPrompts = Object.keys(selectedResults).reduce((acc, modelName) => {
                                    const selectedFileName = selectedResults[modelName];
                                    const model = modelsData.flatMap((entry) =>
                                        Object.values(entry).flat()
                                    ).find((m) =>
                                        m.name && modelName &&
                                        m.name.toLowerCase().trim() === modelName.toLowerCase().trim() &&
                                        m.file_name === selectedFileName && selectedFileName
                                    );
                                    console.log("allSelectedPrompts::", modelName, selectedFileName, model);
                                    

                                    if (model && selectedFileName) {
                                        const parsedFile = parseFileName(selectedFileName);
                                        if (parsedFile) {
                                            const prompts = model.prompt.filter((prompt: { user: string; assistant: string }) => {
                                                // Match the selected file's timestamp with the prompt's creation date
                                                const promptDate = parsedFile.timestamp.substring(0, 8); // Extract date from the selected file
                                                const createdAtDate = model.created_at.substring(0, 8); // Extract date from the model's created_at
                                                return promptDate === createdAtDate;
                                            });

                                            // Add the prompts to the accumulator with the JSON file name as the key
                                            acc[selectedFileName] = prompts;
                                        }
                                    }

                                    return acc;
                                }, {} as { [key: string]: any[] });

                                console.log("All Selected Prompts:", allSelectedPrompts);
                                

                                // Assuming you have access to the prompt's creation date (string or Date)
                                // Grab the raw date
                                const promptCreateRaw = model?.model?.created_at;

                                // Convert safely to a Date object
                                const parsedDate = promptCreateRaw
                                ? parse(promptCreateRaw, "yyyyMMdd'T'HHmmss", new Date())
                                : null;

                                // Format only if valid
                                const formattedPromptDate = parsedDate && isValid(parsedDate)
                                ? format(parsedDate, 'dd MMM yyyy hh:mmaaa')
                                : format(new Date(), 'dd MMM yyyy hh:mmaaa');


                                console.log(`Model: ${model?.model?.name}, Selected Date: ${formattedPromptDate}`);
                                console.log(`Prompts:`, model?.model?.prompt);
                                console.log(`Filtered Prompts:`, filteredPrompts);

                                return (
                                    <div id={`chat-outter-wrap-${model.model?.name}`} className="chat-outter-wrap" key={model?.model?.name}>
                                        
                                        {/* { modelScores[selectedGranite] && modelScores[selectedOther] 
                                            ? parseFloat(modelScores[model?.model?.name ?? '']) > parseFloat(modelScores[selectedGranite === model?.model?.name ? selectedOther : selectedGranite]) 
                                                ? (
                                                    <div className="ribbon">
                                                        <span className="ribbon4">Recommented Model</span>
                                                    </div>
                                                ) 
                                                : (null) 
                                            : (null)
                                        } */}
                                        
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <h4 style={{ textTransform: "capitalize", marginBottom: "10px", marginTop: "0" }}>{model?.model?.name} {
                                                modelScores[selectedGranite] && modelScores[selectedOther] 
                                                ? parseFloat(modelScores[model?.model?.name ?? '']) > parseFloat(modelScores[selectedGranite === model?.model?.name ? selectedOther : selectedGranite]) 
                                                    ? (<span style={{ fontSize: '0.8rem', padding: '0.4rem', color: '#069d37', borderRadius: '10rem' }}>Recommended</span>)
                                                    : ('')
                                                : ('')
                                            }</h4>
                                        </div>

                                        <p><strong>Description:</strong> Currently No Description Available.</p>
                                        
                                        <div className="score-wrapper">
                                            <strong>Pass@1 Score</strong>
                                            <Tag className="score-capsule" size="md" type={
                                                modelScores[selectedGranite] && modelScores[selectedOther] 
                                                ? parseFloat(modelScores[model?.model?.name ?? '']) > parseFloat(modelScores[selectedGranite === model?.model?.name ? selectedOther : selectedGranite]) 
                                                    ? 'green' 
                                                    : 'red'
                                                : 'cyan'
                                            }>{modelScores[model?.model?.name ?? ''] || 'N/A'}</Tag>
                                            
                                        </div>

                                        <div className="time-taken-wrap">
                                            <p>
                                                <strong>
                                                    Response Time{" "} <span><Help width={"0.75rem"} height={"0.75rem"} /></span>
                                                    :
                                                </strong>
                                                <span
                                                    style={{
                                                        paddingLeft: "0.3rem",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "0.25rem",
                                                    }}
                                                >
                                                   {typeof model?.model?.total_time === "number" && !isNaN(model.model.total_time)
                                                    ? (
                                                        fastestTime !== null && (
                                                            <>
                                                                <span>{(model.model.total_time / 1000).toFixed(2)}s </span>
                                                                {fastestTime === model.model.total_time && (
                                                                    <span className="flash-icon">
                                                                        <FlashFilled size={14} color="#facc15" strokeWidth={2} />
                                                                    </span>
                                                                )}
                                                            </>
                                                        )
                                                    )
                                                    : "--"
                                                    }
                                                </span>
                                            </p>
                                        </div>

                                        <div style={{ margin: "0.5rem 0"}}>
                                            <Grid fullWidth narrow>
                                                {/* <Column lg={8} md={8} sm={4}>
                                                    <DatePicker 
                                                        datePickerType="single"
                                                        className="question-date-picker"
                                                        dateFormat="d/m/Y"
                                                        maxDate={new Date().setDate(new Date().getDate())}
                                                        value={selectedDates[model?.model?.name ?? ''] ? new Date(selectedDates[model?.model?.name ?? ''] as string) : undefined}
                                                        // onChange={handleDateChange(model, selectedDates[model.name] ? new Date(selectedDates[model.name] as string) : null)}
                                                        onChange={(eventOrDates) => {
                                                            const dateValue = Array.isArray(eventOrDates) ? eventOrDates[0] : eventOrDates;
                                                            const formattedDate = dateValue 
                                                                ? new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000))
                                                                    .toISOString()
                                                                    .split('T')[0]
                                                                : null;
                                                        
                                                            const modelName = model?.model?.name ?? 'default';
                                                            
                                                            // Update selected date and clear existing result
                                                            setSelectedDates(prev => ({
                                                              ...prev,
                                                              [modelName]: formattedDate
                                                            }));
                                                            
                                                            setSelectedResults(prev => ({
                                                              ...prev,
                                                              [modelName]: '' // Clear selected result when date changes
                                                            }));

                                                          }}
                                                    >
                                                        <DatePickerInput
                                                            id={`date-picker-${model?.model?.name}`}
                                                            placeholder="dd/mm/yyyy"
                                                            labelText="Select a Date"
                                                        />
                                                    </DatePicker>
                                                </Column> */}
                                                <Column lg={8} md={8} sm={4}>
                                                    <Dropdown
                                                        id={`question-combo-box-${model?.model?.name}`}
                                                        className="question-combo-box"
                                                        items={questionNumbers}
                                                        itemToString={(item) => (item ? item : '')}
                                                        onChange={({ selectedItem }) => setSelectedQuestions((prev) => ({
                                                            ...prev,
                                                            [model?.model?.name || 'default_key']: selectedItem as string
                                                        }))}
                                                        selectedItem={selectedQuestion}
                                                        titleText="Select a Question"
                                                        label="Choose a question"
                                                    />
                                                </Column>
                                                <Column lg={8} md={8} sm={4}>
                                                    <ComboBox
                                                        id={`result-combo-box-${model?.model?.name}`}
                                                        className="result-combo-box"
                                                        items={model?.modelJsonFiles || []}
                                                        itemToString={(item) => {
                                                            if (!item) return 'Select Result';
                                                            const parsed = parseFileName(item);
                                                            if (!parsed) return item;

                                                            // Format timestamp to DD-MM-YYYY HH:MM am/pm
                                                            const datePart = parsed.timestamp.substring(0, 8);
                                                            const timePart = parsed.timestamp.substring(9);
                                                            const year = datePart.substring(0, 4);
                                                            const month = datePart.substring(4, 6);
                                                            const day = datePart.substring(6, 8);

                                                            const hours = parseInt(timePart.substring(0, 2));
                                                            const minutes = timePart.substring(2, 4);
                                                            const ampm = hours >= 12 ? 'pm' : 'am';
                                                            const twelveHour = hours % 12 || 12;

                                                            return `${parsed.modelName}-${day}-${month}-${year} ${twelveHour}:${minutes}${ampm}`;
                                                        }}
                                                        onChange={({ selectedItem }) => {
                                                            const currentModelName = model?.model?.name as string;
                                                            setSelectedResults((prev) => ({
                                                                ...prev,
                                                                [currentModelName]: selectedItem as string,
                                                            }));

                                                            // Update filtered prompts based on the selected result
                                                            const selectedFileName = selectedItem as string;
                                                            const filteredPrompts = modelsData
                                                                .flatMap((entry) => Object.values(entry).flat())
                                                                .filter((model) => model.file_name === selectedFileName)
                                                                .flatMap((model) => model.prompt || []);

                                                            setFilteredPrompts((prev) => ({
                                                                ...prev,
                                                                [model?.model?.name || '']: filteredPrompts,
                                                            }));

                                                            console.log(`Filtered Prompts for ${model?.model?.name}:`, filteredPrompts);
                                                        }}
                                                        selectedItem={selectedResults[model?.model?.name as string] || null}
                                                        titleText="Select a Result"
                                                        placeholder="Choose a result version"
                                                        shouldFilterItem={({ item, inputValue }) =>
                                                            item.toLowerCase().includes(inputValue?.toLowerCase() || '')
                                                        }
                                                        disabled={!model?.modelJsonFiles?.length}
                                                    />
                                                    {/* <p id="result-warn-message" style={{ display: "block", color: "red", margin: "0.4rem 0", fontSize: "0.75rem" }}>Please select a result from dropdown.</p> */}
                                                </Column>
                                            </Grid>

                                            
                                            <Grid fullWidth narrow> 
                                                {(selectedResults[model?.model?.name as string] || model?.modelJsonFiles?.length === 1) && (
                                                <Column lg={16} md={8} sm={4}>
                                                    <Button
                                                        kind="danger--tertiary"
                                                        size="sm"
                                                        onClick={() => {
                                                            const modelName = model?.model?.name as string;
                                                            setSelectedQuestions(prev => ({ ...prev, [modelName]: "All" }));
                                                            setSelectedResults(prev => ({ ...prev, [modelName]: '' }));
                                                            setSelectedDates(prev => ({ ...prev, [modelName]: null }));
                                                        }}
                                                        disabled={
                                                            !selectedResults[model?.model?.name as string] &&
                                                            !selectedDates[model?.model?.name as string]
                                                        }
                                                        style={{ 
                                                            marginTop: "0.8rem",
                                                            padding: "0.5rem 1rem",
                                                            width: "10rem",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            float: "right",
                                                            display: !selectedResults[model?.model?.name as string] &&
                                                            !selectedDates[model?.model?.name as string] ? "none" : "block"
                                                        }}
                                                    >
                                                        Reset Filter
                                                    </Button>
                                                </Column>
                                                )}
                                            </Grid>
                                        </div>
                                        <p>
                                            <strong>Prompt:</strong>
                                        </p>

                                        <div>
                                            <Checkbox
                                                id={`solid-background-toggle-${model?.model?.name}`}
                                                className="solid-background-toggle"
                                                labelText="Remove Prompt Background Wallpaper"
                                                checked={model && model.model ? solidBackgrounds[model.model.name] || false : false}
                                                onChange={() => {
                                                    const modelName = model?.model?.name ?? 'default';
                                                    setSolidBackgrounds(prev => ({
                                                        ...prev, [modelName]: !prev[modelName]
                                                    }));
                                                }}
                                                style={{ float: "right" }}
                                            />
                                        </div>

                                        <div className={solidBackgrounds[model?.model?.name ?? 'default'] ? "chat-screen solid-bg" : "chat-screen"}>
                                            <div className="date-capsule-wrap">
                                                <Tag className="date-capsule" type="warm-gray">
                                                    {selectedDates[model?.model?.name ?? 'default']
                                                    ? format(new Date(selectedDates[model?.model?.name ?? 'default'] || ''), 'dd-MM-yyyy h:mmaaa')
                                                    : formattedPromptDate}
                                                </Tag>
                                            </div>
                                            {filteredPrompts && filteredPrompts.length === 0 ? (
                                                <div style={{ color: "#fff", background: "#606060cc", borderRadius: "4px", padding: "0.7rem", textAlign: "center", marginTop: "20px" }}>
                                                    No results found. <br /><br /> Please select another model or Click reset filter button to see the latest prompt result.
                                                </div>
                                            ) : (
                                                <ul>
                                                    {selectedQuestion === "All" ? (
                                                        filteredPrompts && filteredPrompts.map((prompt, index) => (
                                                            <li key={index}>
                                                                <div className="user-message-bubble">
                                                                    <strong>User</strong>
                                                                    {formatPromptWithCodeTags(prompt.user)}
                                                                </div>
                                                                <div className="assistant-message-bubble">
                                                                    <strong>Assistant</strong>
                                                                    {formatPromptWithCodeTags(prompt.assistant)}
                                                                </div>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        filteredPrompts && filteredPrompts
                                                            .filter((_, index) => index === parseInt(selectedQuestion.split(" ")[1]) - 1)
                                                            .map((prompt, index) => (
                                                                <li key={index}>
                                                                    <div className="user-message-bubble">
                                                                        <strong>User</strong>
                                                                        {formatPromptWithCodeTags(prompt.user)}
                                                                    </div>
                                                                    <div className="assistant-message-bubble">
                                                                        <strong>Assistant</strong>
                                                                        {formatPromptWithCodeTags(prompt.assistant)}
                                                                    </div>
                                                                </li>
                                                            ))
                                                        )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Column>
                ) : (
                    <Column sm={4} md={8} lg={16}>
                        {!isLoading && (
                            <div style={{ color: "#fff", background: "#262626", border: "0.4px solid #514f4f", borderRadius: "4px", padding: "0.7rem", textAlign: "center", boxShadow: "0 0 6px 1px rgb(0 0 17)",  margin: "1.2rem auto", width: "50%" }}>
                                <p>No comparison found. <br /> Please select models to compare.</p>
                            </div>
                        )}
                    </Column>
                )
                }
            </Grid>
        </div>
    );
};



export default ModelComparison;

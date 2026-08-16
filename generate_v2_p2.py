# -*- coding: utf-8 -*-
"""Part 2: Main component start, states, API calls, inline field editor, modals for protocol steps and condition sheets."""

code = r'''
export function DermaWorkspace({ activeSection = 'dashboard', onSectionChange }: DermaWorkspaceProps) {
  // ── Toast & Modals ──
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<boolean>(false);
  const [showDpMenu, setShowDpMenu] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dpMenuRef = useRef<HTMLDivElement>(null);
  const dpKey = 'miracle_dp_dermatologist@miracle.com';
  const [customDp, setCustomDp] = useState<string | null>(() => localStorage.getItem(dpKey));

  // Stored user
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('miracle_user') || '{}');
    } catch {
      return {};
    }
  })();

  // ── 1. Dashboard Overview Metrics ──
  const [overviewMetrics, setOverviewMetrics] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [attentionPatients, setAttentionPatients] = useState<any[]>([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState<any[]>([]);
  const [topConcerns, setTopConcerns] = useState<any[]>([]);

  // ── 2. Patients List & 360 Dossier ──
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState<boolean>(true);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patientSkinFilter, setPatientSkinFilter] = useState<string>('All');
  const [patientConcernFilter, setPatientConcernFilter] = useState<string>('All');
  const [patientSort, setPatientSort] = useState<string>('name');
  const [selectedPatientDossier, setSelectedPatientDossier] = useState<any | null>(null);
  const [dossierLoading, setDossierLoading] = useState<boolean>(false);

  // ── 3. Assessments ──
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState<boolean>(true);
  const [assessmentSearch, setAssessmentSearch] = useState<string>('');
  const [assessmentSeverityFilter, setAssessmentSeverityFilter] = useState<string>('All');

  // ── 4. Clinical AI Insights & Risk Intelligence ──
  const [insightsList, setInsightsList] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(true);
  const [insightRiskFilter, setInsightRiskFilter] = useState<string>('All');

  // ── 5. Treatment Plans ──
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [planStatusFilter, setPlanStatusFilter] = useState<string>('All');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState<boolean>(false);
  const [planFormPatientId, setPlanFormPatientId] = useState<string>('');
  const [planFormTitle, setPlanFormTitle] = useState<string>('');
  const [planFormDiagnosis, setPlanFormDiagnosis] = useState<string>('');
  const [planFormSeverity, setPlanFormSeverity] = useState<string>('Moderate');
  const [planFormObjectives, setPlanFormObjectives] = useState<string>('');
  const [planFormActives, setPlanFormActives] = useState<string>('Adapalene 0.1%, Ceramide Complex');
  const [planFormFrequency, setPlanFormFrequency] = useState<string>('Daily - Morning & Evening');
  const [planFormDuration, setPlanFormDuration] = useState<number>(8);
  const [planFormInstructions, setPlanFormInstructions] = useState<string>('');
  const [planFormNotes, setPlanFormNotes] = useState<string>('');
  const [planSaving, setPlanSaving] = useState<boolean>(false);

  // ── 6. Prescriptions (Rx) ──
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState<boolean>(true);
  const [rxSearch, setRxSearch] = useState<string>('');
  const [rxStatusFilter, setRxStatusFilter] = useState<string>('All');
  const [showCreateRxModal, setShowCreateRxModal] = useState<boolean>(false);
  const [rxPatientId, setRxPatientId] = useState<string>('');
  const [rxMedicationName, setRxMedicationName] = useState<string>('');
  const [rxDosage, setRxDosage] = useState<string>('Pea-sized amount (0.5g)');
  const [rxFrequency, setRxFrequency] = useState<string>('Every alternate evening (PM)');
  const [rxDuration, setRxDuration] = useState<string>('12 Weeks');
  const [rxRefills, setRxRefills] = useState<number>(2);
  const [rxInstructions, setRxInstructions] = useState<string>('Apply over light moisturizer to buffer irritation.');
  const [rxWarnings, setRxWarnings] = useState<string>('Mandatory daily SPF 50+ broad-spectrum sunscreen.');
  const [rxSaving, setRxSaving] = useState<boolean>(false);

  // ── 7. Progress Tracking & Timeline Modal ──
  const [selectedTimelinePatient, setSelectedTimelinePatient] = useState<any | null>(null);

  // ── 8. Clinical Reports & Dossiers ──
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(true);
  const [reportSearch, setReportSearch] = useState<string>('');

  // ── 9. Consultations & Queue ──
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptsLoading, setApptsLoading] = useState<boolean>(true);
  const [apptTab, setApptTab] = useState<'all' | 'referred' | 'requested' | 'accepted' | 'completed'>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // ── 10. Live Calendar Modal / View ──
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [selectedCalDate, setSelectedCalDate] = useState<string>('2026-08-18');

  // ── 11. Follow-ups & Reminders ──
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState<boolean>(true);

  // ── 12. Tools & Knowledge Resources Modals ──
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState<boolean>(true);
  const [ingredientSearch, setIngredientSearch] = useState<string>('');
  const [ingredientCat, setIngredientCat] = useState<string>('All');

  const [protocols, setProtocols] = useState<any[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState<boolean>(true);
  const [protocolSearch, setProtocolSearch] = useState<string>('');
  const [selectedProtocolModal, setSelectedProtocolModal] = useState<any | null>(null);

  const [skinConditions, setSkinConditions] = useState<any[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState<boolean>(true);
  const [conditionSearch, setConditionSearch] = useState<string>('');
  const [selectedConditionModal, setSelectedConditionModal] = useState<any | null>(null);

  const [publications, setPublications] = useState<any[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState<boolean>(true);
  const [pubSearch, setPubSearch] = useState<string>('');
  const [pubCat, setPubCat] = useState<string>('All');

  // ── Profile & Account Settings State (Exact Consultant Standard) ──
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileName, setProfileName] = useState<string>('Dr. Rajesh Verma, M.D.');
  const [profileEmail, setProfileEmail] = useState<string>('dermatologist@miracle.com');
  const [profilePhone, setProfilePhone] = useState<string>('+91 98765 43210');
  const [profileTitle, setProfileTitle] = useState<string>('Senior Consultant Dermatologist');
  const [profileSpec, setProfileSpec] = useState<string>('Clinical & Procedural Dermatology');
  const [profileLicense, setProfileLicense] = useState<string>('MCI-DERM-48921-IN');
  const [profileAffiliation, setProfileAffiliation] = useState<string>('Miracle Advanced Skin & Laser Institute');
  const [profileExp, setProfileExp] = useState<number>(12);
  const [profileBio, setProfileBio] = useState<string>('Board-certified dermatologist specializing in complex inflammatory acne, melasma, barrier restitution protocols, and clinical retinoid pharmacokinetics.');
  const [profileFee, setProfileFee] = useState<number>(1500);
  const [profileQual, setProfileQual] = useState<string>('M.D. Dermatology, Venereology & Leprosy (Gold Medalist)');
  const [profileAvail, setProfileAvail] = useState<string>('Mon-Sat, 10:00 AM - 7:00 PM IST');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState<string>('');

  // Password & Notifications Settings
  const [pwVal, setPwVal] = useState<string>('••••••••••••');
  const [notificationsList, setNotificationsList] = useState<any[]>([
    { id: '1', title: 'Consultation Referral: Ananya Sharma', message: 'Referred by Consultant Priya Sharma for active retinoid evaluation.', category: 'Referral', created_at: '2026-08-16' },
    { id: '2', title: 'Barrier Audit Milestone Due', message: 'Patient Rahul Verma reached Week 6 milestone for barrier TEWL audit.', category: 'Clinical Milestone', created_at: '2026-08-15' },
    { id: '3', title: 'Prescription Refill Request', message: 'Refill #2 requested for Adapalene 0.1% Microsphere Gel.', category: 'Pharmacy Rx', created_at: '2026-08-14' },
  ]);
  const [notifsLoading, setNotifsLoading] = useState<boolean>(false);

  // ── Fetch Functions ──
  const fetchOverview = useCallback(() => {
    setOverviewLoading(true);
    api.getDermaDashboardOverview()
      .then((d: any) => {
        setOverviewMetrics(d.metrics || null);
        setRecentAssessments(d.recent_assessments || []);
        setAttentionPatients(d.attention_patients || []);
        setUpcomingFollowups(d.upcoming_followups || []);
        setTopConcerns(d.top_concerns || []);
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, []);

  const fetchPatients = useCallback(() => {
    setPatientsLoading(true);
    api.getDermaPatients({ search: patientSearch, skin_type: patientSkinFilter, concern: patientConcernFilter, sort_by: patientSort })
      .then((d: any) => setPatients(d.patients || []))
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, [patientSearch, patientSkinFilter, patientConcernFilter, patientSort]);

  const fetchAssessments = useCallback(() => {
    setAssessmentsLoading(true);
    api.getDermaAssessments({ search: assessmentSearch, severity: assessmentSeverityFilter })
      .then((d: any) => setAssessmentsList(d.assessments || []))
      .catch(() => setAssessmentsList([]))
      .finally(() => setAssessmentsLoading(false));
  }, [assessmentSearch, assessmentSeverityFilter]);

  const fetchInsights = useCallback(() => {
    setInsightsLoading(true);
    api.getDermaInsights({ risk_level: insightRiskFilter })
      .then((d: any) => setInsightsList(d.insights || []))
      .catch(() => setInsightsList([]))
      .finally(() => setInsightsLoading(false));
  }, [insightRiskFilter]);

  const fetchTreatmentPlans = useCallback(() => {
    setPlansLoading(true);
    api.getDermaTreatmentPlans({ status: planStatusFilter })
      .then((d: any) => setTreatmentPlans(d.treatment_plans || []))
      .catch(() => setTreatmentPlans([]))
      .finally(() => setPlansLoading(false));
  }, [planStatusFilter]);

  const fetchPrescriptions = useCallback(() => {
    setPrescriptionsLoading(true);
    api.getDermaPrescriptions({ search: rxSearch, status: rxStatusFilter })
      .then((d: any) => setPrescriptions(d.prescriptions || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setPrescriptionsLoading(false));
  }, [rxSearch, rxStatusFilter]);

  const fetchReports = useCallback(() => {
    setReportsLoading(true);
    api.getDermaReports({ search: reportSearch })
      .then((d: any) => setReportsList(d.reports || []))
      .catch(() => setReportsList([]))
      .finally(() => setReportsLoading(false));
  }, [reportSearch]);

  const fetchAppointments = useCallback(() => {
    setApptsLoading(true);
    api.getMyAppointments()
      .then((d: any) => setAppointments(Array.isArray(d) ? d : (d?.appointments || [])))
      .catch(() => setAppointments([]))
      .finally(() => setApptsLoading(false));
  }, []);

  const fetchReminders = useCallback(() => {
    setRemindersLoading(true);
    api.getConsultantReminders()
      .then((d: any) => setReminders(d.reminders || []))
      .catch(() => setReminders([]))
      .finally(() => setRemindersLoading(false));
  }, []);

  const fetchIngredients = useCallback(() => {
    setIngredientsLoading(true);
    api.getConsultantIngredients({ search: ingredientSearch, category: ingredientCat !== 'All' ? ingredientCat : undefined })
      .then((d: any) => setIngredients(d.ingredients || []))
      .catch(() => setIngredients([]))
      .finally(() => setIngredientsLoading(false));
  }, [ingredientSearch, ingredientCat]);

  const fetchProtocols = useCallback(() => {
    setProtocolsLoading(true);
    api.getConsultantTreatmentProtocols({ search: protocolSearch })
      .then((d: any) => setProtocols(d.protocols || []))
      .catch(() => setProtocols([]))
      .finally(() => setProtocolsLoading(false));
  }, [protocolSearch]);

  const fetchSkinConditions = useCallback(() => {
    setConditionsLoading(true);
    api.getConsultantSkinConcernsGuide({ search: conditionSearch })
      .then((d: any) => setSkinConditions(d.concerns || []))
      .catch(() => setSkinConditions([]))
      .finally(() => setConditionsLoading(false));
  }, [conditionSearch]);

  const fetchPublications = useCallback(() => {
    setPublicationsLoading(true);
    api.getDermaResearchPublications({ search: pubSearch, category: pubCat !== 'All' ? pubCat : undefined })
      .then((d: any) => setPublications(d.publications || []))
      .catch(() => setPublications([]))
      .finally(() => setPublicationsLoading(false));
  }, [pubSearch, pubCat]);

  const fetchProfile = useCallback(() => {
    setProfileLoading(true);
    api.getDermaProfile()
      .then((d: any) => {
        setProfile(d);
        setProfileName(d.name || storedUser.name || 'Dr. Rajesh Verma, M.D.');
        setProfileEmail(d.email || storedUser.email || 'dermatologist@miracle.com');
        setProfilePhone(d.phone || '+91 98765 43210');
        setProfileTitle(d.title || 'Senior Consultant Dermatologist');
        setProfileSpec(d.specialization || 'Clinical & Procedural Dermatology');
        setProfileLicense(d.license_number || 'MCI-DERM-48921-IN');
        setProfileAffiliation(d.clinic_hospital_affiliation || 'Miracle Advanced Skin & Laser Institute');
        setProfileExp(d.experience_years || 12);
        setProfileBio(d.bio || 'Board-certified dermatologist specializing in complex inflammatory acne, melasma, barrier restitution protocols, and clinical retinoid pharmacokinetics.');
        setProfileFee(d.consultation_fee || 1500);
        setProfileQual(d.qualifications || 'M.D. Dermatology (Gold Medalist)');
        setProfileAvail(d.availability || 'Mon-Sat, 10:00 AM - 7:00 PM IST');
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [storedUser.name, storedUser.email]);

  useEffect(() => {
    fetchOverview();
    fetchPatients();
    fetchAssessments();
    fetchInsights();
    fetchTreatmentPlans();
    fetchPrescriptions();
    fetchReports();
    fetchAppointments();
    fetchReminders();
    fetchIngredients();
    fetchProtocols();
    fetchSkinConditions();
    fetchPublications();
    fetchProfile();
  }, [
    fetchOverview, fetchPatients, fetchAssessments, fetchInsights,
    fetchTreatmentPlans, fetchPrescriptions, fetchReports, fetchAppointments,
    fetchReminders, fetchIngredients, fetchProtocols, fetchSkinConditions,
    fetchPublications, fetchProfile
  ]);

  // Open 360 Dossier
  const openPatientDossier = async (patientId: string) => {
    setDossierLoading(true);
    try {
      const d = await api.getDermaPatientDossier(patientId);
      setSelectedPatientDossier(d);
    } catch {
      setToast({ msg: 'Failed to load patient medical dossier', ok: false });
    } finally {
      setDossierLoading(false);
    }
  };

  // Open Timeline Photos Modal
  const openTimelinePhotosModal = async (patient: any) => {
    try {
      const d = await api.getDermaPatientDossier(patient.patient_id);
      setSelectedTimelinePatient({ ...d, summary: patient });
    } catch {
      setSelectedTimelinePatient({ patient, summary: patient, assessments: [], progress_photos: [], active_routine: [] });
    }
  };

  // Status update for appointments queue
  const handleStatusUpdate = async (apptId: string, newStatus: string, defaultNotes: string) => {
    setActionLoading(prev => ({ ...prev, [apptId]: true }));
    try {
      await api.updateAppointmentStatus(apptId, { status: newStatus, notes: defaultNotes });
      setToast({ msg: `Appointment status updated to ${newStatus.replace(/_/g, ' ')}`, ok: true });
      fetchAppointments();
      fetchOverview();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to update appointment', ok: false });
    } finally {
      setActionLoading(prev => ({ ...prev, [apptId]: false }));
    }
  };

  // Inline Profile Edit Handlers (Exact Consultant Pattern)
  const startEdit = (field: string) => {
    setEditingField(field);
    if (field === 'name') setTempVal(profileName);
    else if (field === 'phone') setTempVal(profilePhone);
    else if (field === 'title') setTempVal(profileTitle);
    else if (field === 'specialization') setTempVal(profileSpec);
    else if (field === 'license_number') setTempVal(profileLicense);
    else if (field === 'clinic_hospital_affiliation') setTempVal(profileAffiliation);
    else if (field === 'experience_years') setTempVal(String(profileExp));
    else if (field === 'consultation_fee') setTempVal(String(profileFee));
    else if (field === 'qualifications') setTempVal(profileQual);
    else if (field === 'availability') setTempVal(profileAvail);
    else if (field === 'bio') setTempVal(profileBio);
    else if (field === 'password') setTempVal('');
  };

  const saveEdit = async () => {
    if (!editingField) return;
    if (editingField === 'password') {
      if (tempVal.length < 6) {
        setToast({ msg: 'Password must be at least 6 characters', ok: false });
        return;
      }
      try {
        await api.changeConsultantPassword({ old_password: 'password123', new_password: tempVal });
        setPwVal('••••••••••••');
        setToast({ msg: 'Password updated successfully', ok: true });
        setEditingField(null);
      } catch (err: any) {
        setToast({ msg: err?.detail || 'Failed to update password', ok: false });
      }
      return;
    }

    const payload: any = {};
    if (editingField === 'name') { payload.name = tempVal; setProfileName(tempVal); }
    else if (editingField === 'phone') { payload.phone = tempVal; setProfilePhone(tempVal); }
    else if (editingField === 'title') { payload.title = tempVal; setProfileTitle(tempVal); }
    else if (editingField === 'specialization') { payload.specialization = tempVal; setProfileSpec(tempVal); }
    else if (editingField === 'license_number') { payload.license_number = tempVal; setProfileLicense(tempVal); }
    else if (editingField === 'clinic_hospital_affiliation') { payload.clinic_hospital_affiliation = tempVal; setProfileAffiliation(tempVal); }
    else if (editingField === 'experience_years') { payload.experience_years = parseInt(tempVal) || 12; setProfileExp(parseInt(tempVal) || 12); }
    else if (editingField === 'consultation_fee') { payload.consultation_fee = parseFloat(tempVal) || 1500; setProfileFee(parseFloat(tempVal) || 1500); }
    else if (editingField === 'qualifications') { payload.qualifications = tempVal; setProfileQual(tempVal); }
    else if (editingField === 'availability') { payload.availability = tempVal; setProfileAvail(tempVal); }
    else if (editingField === 'bio') { payload.bio = tempVal; setProfileBio(tempVal); }

    try {
      await api.updateDermaProfile(payload);
      setToast({ msg: `${editingField.replace(/_/g, ' ')} updated successfully`, ok: true });
      fetchProfile();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to save changes', ok: false });
    }
    setEditingField(null);
  };

  // DP Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    setShowDpMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropSave = (cropped: string) => {
    setCustomDp(cropped);
    localStorage.setItem(dpKey, cropped);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setCropSrc(null);
    setToast({ msg: 'Profile photo updated successfully', ok: true });
  };

  const handleRemoveDp = () => {
    setCustomDp(null);
    localStorage.removeItem(dpKey);
    setShowDpMenu(false);
    window.dispatchEvent(new CustomEvent('miracle_user_updated'));
    setToast({ msg: 'Profile photo removed', ok: true });
  };

  const dpMenuItems = [
    ...(customDp ? [{ label: '👁️ View photo', action: () => { setShowDpMenu(false); setViewPhoto(true); }, danger: false }] : []),
    { label: customDp ? '🔄 Change photo' : '📤 Upload photo', action: () => { setShowDpMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }, danger: false },
    ...(customDp ? [{ label: '🗑️ Remove photo', action: handleRemoveDp, danger: true }] : []),
  ];

  // Submit Plan
  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormPatientId || !planFormTitle || !planFormDiagnosis) {
      setToast({ msg: 'Please fill in patient, plan title, and clinical diagnosis', ok: false });
      return;
    }
    setPlanSaving(true);
    try {
      await api.createDermaTreatmentPlan({
        patient_id: planFormPatientId,
        title: planFormTitle,
        diagnosis: planFormDiagnosis,
        severity: planFormSeverity,
        objectives: planFormObjectives,
        recommended_actives: planFormActives.split(',').map(s => s.trim()).filter(Boolean),
        frequency: planFormFrequency,
        duration_weeks: planFormDuration,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + planFormDuration * 7 * 86400000).toISOString().slice(0, 10),
        instructions: planFormInstructions,
        clinical_notes: planFormNotes,
        status: 'Active',
        progress_percentage: 0
      });
      setToast({ msg: 'Clinical Treatment Plan saved and assigned to patient!', ok: true });
      setShowCreatePlanModal(false);
      fetchTreatmentPlans();
      fetchOverview();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to create treatment plan', ok: false });
    } finally {
      setPlanSaving(false);
    }
  };

  // Submit Prescription (Rx)
  const handleCreateRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxPatientId || !rxMedicationName || !rxDosage) {
      setToast({ msg: 'Please select patient, medication name and dosage', ok: false });
      return;
    }
    setRxSaving(true);
    try {
      await api.createDermaPrescription({
        patient_id: rxPatientId,
        medication_name: rxMedicationName,
        dosage: rxDosage,
        frequency: rxFrequency,
        duration: rxDuration,
        refills_allowed: rxRefills,
        instructions: rxInstructions,
        warnings: rxWarnings,
        status: 'Active'
      });
      setToast({ msg: 'High-potency Rx clinical prescription issued successfully!', ok: true });
      setShowCreateRxModal(false);
      fetchPrescriptions();
      fetchOverview();
    } catch (err: any) {
      setToast({ msg: err?.detail || 'Failed to issue prescription', ok: false });
    } finally {
      setRxSaving(false);
    }
  };

  // Download PDF Report
  const handleDownloadReportPDF = (report: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setToast({ msg: 'Pop-up blocked. Please allow pop-ups to download PDF.', ok: false });
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Clinical Dermatology Report - ${report.patient_name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 40px; }
          .header { border-bottom: 3px solid #2f6b4c; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 24px; font-weight: 900; color: #2f6b4c; letter-spacing: 1.5px; }
          .report-id { font-size: 12px; color: #64748b; font-weight: 700; }
          .score-box { text-align: center; background: #dcfce7; border: 2px solid #16a34a; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
          .score-val { font-size: 44px; font-weight: 900; color: #15803d; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; }
          .card h3 { margin: 0 0 12px; font-size: 13px; color: #2f6b4c; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">MIRACLE MEDICAL DERMATOLOGY CLINIC</div>
            <div style="font-size: 14px; color: #475569; margin-top: 4px;">Formal Clinical Diagnosis & Longitudinal Progress Dossier</div>
          </div>
          <div class="report-id">
            REPORT REF: ${report.code || report.report_code || 'RPT-DERMA-2026'}<br/>
            DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div class="score-box">
          <div style="font-size: 13px; font-weight: 700; color: #15803d; text-transform: uppercase;">Current Skin Health Score</div>
          <div class="score-val">${report.current_score || 84} / 100</div>
          <div style="font-size: 13px; color: #166534; font-weight: 600;">Improvement Rate: +${report.improvement_rate || 32.2}% · Barrier Recovery: ${report.barrier_recovery_pct || 91.5}%</div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Patient & Assessment Identification</h3>
            <div class="row"><span>Patient Full Name:</span><b>${report.patient_name}</b></div>
            <div class="row"><span>Report Classification:</span><b>${report.report_type || 'Clinical Evaluation'}</b></div>
            <div class="row"><span>Baseline Audit Score:</span><b>${report.baseline_score || 62} pts</b></div>
            <div class="row"><span>Regimen Compliance:</span><b>${report.regimen_compliance_pct || 96}%</b></div>
          </div>

          <div class="card">
            <h3>Clinical Supervisions & Next Steps</h3>
            <div class="row"><span>Supervising Physician:</span><b>${profileName}</b></div>
            <div class="row"><span>Medical License:</span><b>${profileLicense}</b></div>
            <div class="row"><span>Next Milestone Audit:</span><b>${report.next_audit_date || '2026-09-15'}</b></div>
            <div class="row"><span>Status:</span><b>Verified & Finalized</b></div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3>Dermatologist Clinical Conclusions & Protocol Guidance</h3>
          <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0;">
            ${report.doctor_conclusions || report.diagnosis_summary || 'Continue daily AM barrier restitution and alternate PM active protocol. Strictly avoid harsh manual scrubs and maintain SPF 50+ protection.'}
          </p>
        </div>

        <div class="footer">
          MIRACLE Tele-Dermatology Platform · Official Clinical Diagnostic Document · Signed Electronically by ${profileName}
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };
'''

with open('derma_v2_p2.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("derma_v2_p2.ts written")

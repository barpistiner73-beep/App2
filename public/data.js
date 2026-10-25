/**
 * FitPulse - Master Data & Preset Libraries
 * מסד נתונים עשיר ומעודכן הכולל תרגילים באנגלית, מאגר מורחב ומקיף, רשתות מזון מהיר, ויחס אומגה 3/6
 */

const FIT_DATA = {
  // קטגוריות שרירים
  muscleGroups: [
    { id: 'all', name: 'All Muscles', icon: '' },
    { id: 'chest', name: 'Chest', icon: '' },
    { id: 'back', name: 'Back', icon: '' },
    { id: 'legs', name: 'Legs & Glutes', icon: '' },
    { id: 'shoulders', name: 'Shoulders', icon: '' },
    { id: 'arms', name: 'Arms', icon: '' },
    { id: 'core', name: 'Core', icon: '' },
    { id: 'cardio', name: 'Cardio', icon: '' }
  ],

  // אפשרויות זמן מנוחה בין סטים לבחירה
  restTimeOptions: [
    { seconds: 90, label: '1.5 Minutes (90s)' },
    { seconds: 120, label: '2 Minutes (120s)' },
    { seconds: 150, label: '2.5 Minutes (150s)' },
    { seconds: 180, label: '3 Minutes (180s)' },
    { seconds: 210, label: '3.5 Minutes (210s)' },
    { seconds: 240, label: '4 Minutes (240s)' },
    { seconds: 300, label: '5 Minutes (300s)' }
  ],

  // סולם דרגת קושי (RPE 1-10) בסיום אימון
  difficultyScale: [
    { level: 1, label: 'Very Easy', desc: 'Light recovery, zero effort', color: '#10b981' },
    { level: 2, label: 'Extremely Light', desc: 'Light warm-up, completely normal breathing', color: '#10b981' },
    { level: 3, label: 'Easy', desc: 'Light effort, can talk easily', color: '#34d399' },
    { level: 4, label: 'Moderate', desc: 'Heart rate rising, comfortable effort', color: '#6ee7b7' },
    { level: 5, label: 'Medium', desc: 'Good work, plenty of energy left', color: '#fbbf24' },
    { level: 6, label: 'Medium-Hard', desc: 'Slightly heavy breathing, ~4 reps left in reserve', color: '#f59e0b' },
    { level: 7, label: 'Hard & Intense', desc: 'Challenging, ~3 reps left in reserve', color: '#f97316' },
    { level: 8, label: 'Very Hard (Optimal)', desc: 'Strong effort, 1-2 reps left (RPE 8)', color: '#ea580c' },
    { level: 9, label: 'Extremely Hard', desc: 'Near total muscle failure (1 rep left)', color: '#f43f5e' },
    { level: 10, label: 'Absolute Failure', desc: 'Complete muscle failure! Could not perform another rep', color: '#ef4444' }
  ],

  // מאגר תרגילים באנגלית מלאה - מורחב ומקיף לכל קבוצות השרירים
    exercises: [
    {"id":"ex_bench_press","name":"Barbell Bench Press","muscle":"chest","category":"Chest","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":8,"defaultWeight":70,"tips":"Keep feet planted firm and elbows tucked at a 75-degree angle."},
    {"id":"ex_incline_bb_press","name":"Incline Barbell Bench Press","muscle":"chest","category":"Chest","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":60,"tips":"Set bench to 30 degrees to target clavicular upper chest."},
    {"id":"ex_decline_press","name":"Decline Bench Press","muscle":"chest","category":"Chest","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":65,"tips":"Isolates lower chest fibers while reducing front delt strain."},
    {"id":"ex_flat_db_press","name":"Flat Dumbbell Press","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":4,"defaultReps":10,"defaultWeight":26,"tips":"Keep wrists stacked over elbows and lower with control."},
    {"id":"ex_incline_db_press","name":"Incline Dumbbell Press","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":24,"tips":"Set bench to 30-degree incline and focus on upper chest contraction."},
    {"id":"ex_decline_db_press","name":"Decline Dumbbell Press","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":22,"tips":"Use a comfortable range and keep shoulder blades retracted."},
    {"id":"ex_low_incline_db_press","name":"Low-Incline Dumbbell Press","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":24,"tips":"15 to 20 degree bench angle provides optimal upper chest fiber recruitment."},
    {"id":"ex_machine_chest_press","name":"Machine Chest Press","muscle":"chest","category":"Chest","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":55,"tips":"Adjust handles to mid-chest height and squeeze to full lockout."},
    {"id":"ex_incline_machine_press","name":"Incline Machine Chest Press","muscle":"chest","category":"Chest","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":50,"tips":"Drive upward along guided path with stable back support."},
    {"id":"ex_chest_press_single","name":"Single-Arm Machine Chest Press","muscle":"chest","category":"Chest","equipment":"Machine","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":30,"tips":"Keep hips and shoulders square throughout each unilateral repetition."},
    {"id":"ex_pec_deck","name":"Pec Deck Fly","muscle":"chest","category":"Chest","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":45,"tips":"Keep chest lifted and squeeze pectorals together at full contraction."},
    {"id":"ex_cable_fly","name":"Cable Crossover Fly","muscle":"chest","category":"Chest","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":15,"tips":"Maintain a slight bend in elbows and hug forward for constant tension."},
    {"id":"ex_high_cable_fly","name":"High-to-Low Cable Fly","muscle":"chest","category":"Chest","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":17.5,"tips":"Pulleys set high, sweep downward to heavily emphasize lower pectorals."},
    {"id":"ex_low_cable_fly","name":"Low-to-High Cable Fly","muscle":"chest","category":"Chest","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":12.5,"tips":"Pulleys set low, scoop forward and upward to clavicular chest fibers."},
    {"id":"ex_incline_cable_fly","name":"Incline Cable Fly","muscle":"chest","category":"Chest","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":15,"tips":"Lie on incline bench between low pulleys for isolated upper chest tension."},
    {"id":"ex_single_cable_fly","name":"Single-Arm Cable Fly","muscle":"chest","category":"Chest","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":12.5,"tips":"Brace your trunk and avoid rotating toward the stack."},
    {"id":"ex_db_fly","name":"Flat Dumbbell Fly","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":14,"tips":"Deep stretch at bottom with slight elbow bend; avoid overstretching shoulder capsule."},
    {"id":"ex_incline_db_fly","name":"Incline Dumbbell Fly","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":12,"tips":"Incline angle targets upper pec stretch and contraction."},
    {"id":"ex_dips","name":"Chest Dips","muscle":"chest","category":"Chest","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":0,"tips":"Lean torso forward slightly to place primary emphasis on lower chest."},
    {"id":"ex_weighted_dips","name":"Weighted Chest Dips","muscle":"chest","category":"Chest","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":15,"tips":"Use dipping belt to progressively overload chest and triceps."},
    {"id":"ex_pushups","name":"Push-Ups","muscle":"chest","category":"Chest","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":20,"defaultWeight":0,"tips":"Maintain a rigid plank posture and lower chest to an inch off the ground."},
    {"id":"ex_decline_pushup","name":"Decline Push-Up","muscle":"chest","category":"Chest","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Elevate feet on bench or box to shift load onto upper chest."},
    {"id":"ex_incline_pushup","name":"Incline Push-Up","muscle":"chest","category":"Chest","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Hands on elevated surface for high volume or recovery work."},
    {"id":"ex_close_grip_pushup","name":"Close-Grip Push-Up","muscle":"chest","category":"Chest","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Keep elbows near sides to challenge inner chest and triceps."},
    {"id":"ex_smith_bench_press","name":"Smith Machine Bench Press","muscle":"chest","category":"Chest","equipment":"Smith Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":60,"tips":"Set safety stops and drive straight through the fixed path."},
    {"id":"ex_smith_incline_press","name":"Smith Machine Incline Press","muscle":"chest","category":"Chest","equipment":"Smith Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":55,"tips":"Fixed plane allows deep focus on clavicular chest hypertrophy."},
    {"id":"ex_dumbbell_pullover","name":"Dumbbell Pullover","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":22,"tips":"Lie perpendicular across bench and stretch ribcage under control."},
    {"id":"ex_hex_press","name":"Dumbbell Squeeze / Hex Press","muscle":"chest","category":"Chest","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":20,"tips":"Press two dumbbells squeezed firmly together throughout range."},
    {"id":"ex_floor_press","name":"Barbell Floor Press","muscle":"chest","category":"Chest","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":65,"tips":"Pause triceps gently on floor to build pressing power and triceps lockout."},
    {"id":"ex_band_chest_press","name":"Resistance Band Chest Press","muscle":"chest","category":"Chest","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Anchor band securely behind back for ascending resistance curve."},
    {"id":"ex_deadlift","name":"Conventional Barbell Deadlift","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":6,"defaultWeight":110,"tips":"Ultimate power lift: drive the floor away and keep neutral spine."},
    {"id":"ex_sumo_deadlift","name":"Sumo Deadlift","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":6,"defaultWeight":110,"tips":"Wide stance with toes out; opens hips and shortens torso lever arm."},
    {"id":"ex_trap_bar_deadlift","name":"Trap Bar Deadlift","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":6,"defaultWeight":100,"tips":"Neutral hand grip reduces shear stress on the lower back."},
    {"id":"ex_barbell_row","name":"Bent-Over Barbell Row","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":8,"defaultWeight":60,"tips":"Keep spine flat, core engaged, and pull bar directly toward belly button."},
    {"id":"ex_yates_row","name":"Reverse-Grip (Yates) Barbell Row","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":60,"tips":"Supinated grip with 70-degree torso angle heavily loads lower lats and biceps."},
    {"id":"ex_pendlay_row","name":"Pendlay Barbell Row","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":6,"defaultWeight":65,"tips":"Strict row starting from a dead stop on the floor each repetition."},
    {"id":"ex_t_bar_row","name":"T-Bar Row","muscle":"back","category":"Back","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":10,"defaultWeight":50,"tips":"Keep torso braced and pull handles smoothly toward lower ribs."},
    {"id":"ex_chest_supported_row","name":"Chest-Supported Machine Row","muscle":"back","category":"Back","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":45,"tips":"Pad eliminates spinal fatigue for pure upper back and lat isolation."},
    {"id":"ex_chest_supported_db_row","name":"Chest-Supported Dumbbell Row","muscle":"back","category":"Back","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":22,"tips":"Set bench to 45 degrees, pull dumbbells back with zero lower back strain."},
    {"id":"ex_one_arm_db_row","name":"One-Arm Dumbbell Row","muscle":"back","category":"Back","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":26,"tips":"Pull dumbbell toward hip crease while maintaining square shoulders."},
    {"id":"ex_kroc_row","name":"High-Rep Kroc Row","muscle":"back","category":"Back","equipment":"Dumbbell","unilateral":true,"defaultSets":2,"defaultReps":20,"defaultWeight":32,"tips":"Heavy dumbbell rows performed for high repetition with controlled body English."},
    {"id":"ex_meadows_row","name":"Meadows Landmine Row","muscle":"back","category":"Back","equipment":"Barbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":35,"tips":"Stand perpendicular to landmine sleeve and flare elbow slightly for massive lat width."},
    {"id":"ex_seal_row","name":"Barbell Seal Row","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":50,"tips":"Lie prone horizontally on elevated bench; completely eliminates cheating momentum."},
    {"id":"ex_lat_pulldown","name":"Lat Pulldown","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":4,"defaultReps":10,"defaultWeight":55,"tips":"Avoid swinging your lower back; drive down through your elbows."},
    {"id":"ex_close_lat_pulldown","name":"Close-Grip Lat Pulldown","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":55,"tips":"V-bar attachment enables deep stretch and powerful lower lat contraction."},
    {"id":"ex_neutral_lat_pulldown","name":"Neutral-Grip Lat Pulldown","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":55,"tips":"Shoulder-width neutral grip aligns naturally with shoulder joint mechanics."},
    {"id":"ex_underhand_lat_pulldown","name":"Underhand Reverse Lat Pulldown","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":50,"tips":"Supinated grip increases biceps recruitment and lower lat stretch."},
    {"id":"ex_single_arm_pulldown","name":"Single-Arm Kneeling Lat Pulldown","muscle":"back","category":"Back","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Kneel and pull unilaterally to correct side-to-side lat imbalances."},
    {"id":"ex_pullups","name":"Wide-Grip Pull-Up","muscle":"back","category":"Back","equipment":"Bodyweight","unilateral":false,"defaultSets":4,"defaultReps":8,"defaultWeight":0,"tips":"Pull chest toward bar while retracting shoulder blades down and back."},
    {"id":"ex_neutral_pullup","name":"Neutral-Grip Pull-Up","muscle":"back","category":"Back","equipment":"Bodyweight","unilateral":false,"defaultSets":4,"defaultReps":8,"defaultWeight":0,"tips":"Palms facing each other reduces shoulder impingement while recruiting lats."},
    {"id":"ex_chinups","name":"Chin-Ups / Underhand Grip","muscle":"back","category":"Back","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":0,"tips":"Supinated grip allows full bicep engagement alongside heavy lat loading."},
    {"id":"ex_assisted_pullup","name":"Assisted Pull-Up","muscle":"back","category":"Back","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":30,"tips":"Counterweight platform enables perfect form and full range of motion."},
    {"id":"ex_seated_cable_row","name":"Seated Cable Row","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":50,"tips":"Full stretch forward followed by maximum scapular squeeze backwards."},
    {"id":"ex_wide_cable_row","name":"Wide-Grip Seated Cable Row","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":45,"tips":"Wide overhand grip targets upper back, rhomboids, and rear delts."},
    {"id":"ex_single_cable_row","name":"Single-Arm Cable Row","muscle":"back","category":"Back","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Avoid twisting; finish with elbow close to your hip."},
    {"id":"ex_pullover_cable","name":"Straight-Arm Cable Pulldown","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":25,"tips":"Isolates latissimus dorsi without bicep fatigue."},
    {"id":"ex_lat_prayer","name":"Kneeling Cable Lat Prayer","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Kneel in front of high cable rope and arc down for peak lat stretch."},
    {"id":"ex_rack_pull","name":"Barbell Rack Pull","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":6,"defaultWeight":120,"tips":"Set bar on safety pins just below knees to overload upper back and traps."},
    {"id":"ex_barbell_shrug","name":"Barbell Shrug","muscle":"back","category":"Back","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":12,"defaultWeight":80,"tips":"Elevate shoulder girdle straight upward and pause 1 second at peak."},
    {"id":"ex_db_shrug","name":"Dumbbell Shrug","muscle":"back","category":"Back","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":30,"tips":"Holding dumbbells at sides provides a natural ergonomic line of pull for traps."},
    {"id":"ex_back_extension","name":"45-Degree Back Extension","muscle":"back","category":"Back","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Hinge at hips to strengthen spinal erectors, glutes, and hamstrings."},
    {"id":"ex_smith_bent_row","name":"Smith Machine Bent-Over Row","muscle":"back","category":"Back","equipment":"Smith Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":50,"tips":"Fixed bar path stabilizes position for strict upper back contraction."},
    {"id":"ex_inverted_row","name":"Inverted Bodyweight Row","muscle":"back","category":"Back","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":0,"tips":"Hang under barbell set in power rack and pull chest to bar with straight core."},
    {"id":"ex_band_row","name":"Resistance Band Row","muscle":"back","category":"Back","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Anchor band at chest height and control eccentric return."},
    {"id":"ex_band_assisted_pullup","name":"Resistance Band Assisted Pull-Up","muscle":"back","category":"Back","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":0,"tips":"Loop band under knee or foot to assist top portion of the pull."},
    {"id":"ex_squat","name":"Barbell Back Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":8,"defaultWeight":90,"tips":"Squat below parallel with heels firmly planted on the floor."},
    {"id":"ex_low_bar_squat","name":"Low-Bar Barbell Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":6,"defaultWeight":95,"tips":"Rest bar across rear delts; emphasizes posterior chain and glute power."},
    {"id":"ex_front_squat","name":"Barbell Front Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":65,"tips":"High elbow position emphasizes quad isolation and upright posture."},
    {"id":"ex_zercher_squat","name":"Zercher Barbell Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":60,"tips":"Cradle bar in elbow crooks for immense quad and anterior core loading."},
    {"id":"ex_hack_squat","name":"Hack Squat Machine","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":10,"defaultWeight":80,"tips":"Keep lower back supported and drive through midfoot for quad focus."},
    {"id":"ex_leg_press","name":"45-Degree Leg Press","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":10,"defaultWeight":140,"tips":"Do not lock knees out at the top to protect joints."},
    {"id":"ex_single_leg_press","name":"Single-Leg Press","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":60,"tips":"Use comfortable depth and keep pelvis firmly supported on seat."},
    {"id":"ex_goblet_squat","name":"Dumbbell Goblet Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":24,"tips":"Keep dumbbell close to sternum and knees tracking over toes."},
    {"id":"ex_belt_squat","name":"Belt Squat Machine","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":70,"tips":"Heavy quad and glute loading with zero axial spinal compression."},
    {"id":"ex_bulgarian_split_squat","name":"Bulgarian Split Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":14,"tips":"Unilateral leg strength builder with high quad/glute activation."},
    {"id":"ex_smith_split_squat","name":"Smith Machine Split Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Smith Machine","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":40,"tips":"Elevate rear foot on bench; Smith track removes balance limitations."},
    {"id":"ex_lunges","name":"Dumbbell Walking Lunges","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":16,"tips":"Take long strides maintaining 90-degree bend in both knees."},
    {"id":"ex_reverse_lunge","name":"Dumbbell Reverse Lunge","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":16,"tips":"Step back under control; easier on knees than forward lunges."},
    {"id":"ex_stepup","name":"Dumbbell Step-Up","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":14,"tips":"Drive through the elevated foot without pushing off the trailing leg."},
    {"id":"ex_leg_extension","name":"Leg Extension Machine","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":50,"tips":"Isolates quadriceps at full extension with 1-second pause."},
    {"id":"ex_single_leg_extension","name":"Single-Leg Extension","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Work each leg independently to resolve strength imbalances."},
    {"id":"ex_sissy_squat","name":"Sissy Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":0,"tips":"Isolates the rectus femoris quadriceps at maximum knee flexion."},
    {"id":"ex_rdl","name":"Romanian Deadlift (RDL)","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":65,"tips":"Hinge hips backwards with soft knees to stretch hamstrings fully."},
    {"id":"ex_db_rdl","name":"Dumbbell Romanian Deadlift","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":24,"tips":"Dumbbells travel close to shins allowing variable wrist rotation."},
    {"id":"ex_single_leg_rdl","name":"Single-Leg Romanian Deadlift","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":14,"tips":"Keep hips square and use support if needed for balance."},
    {"id":"ex_stiff_leg_deadlift","name":"Stiff-Legged Barbell Deadlift","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":60,"tips":"Keep knees almost straight and hips high to deeply load hamstrings."},
    {"id":"ex_barbell_good_morning","name":"Barbell Good Morning","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":40,"tips":"Use light load and hinge while maintaining a neutral spine."},
    {"id":"ex_hamstring_curl","name":"Lying Leg Curl","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":45,"tips":"Controlled eccentric phase for optimal hamstring fiber loading."},
    {"id":"ex_seated_leg_curl","name":"Seated Leg Curl","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":50,"tips":"Align knee joint with machine pivot; stretches hamstrings at hip joint."},
    {"id":"ex_single_leg_curl","name":"Single-Leg Seated Leg Curl","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Move smoothly and keep hips glued to the seat."},
    {"id":"ex_nordic_curl","name":"Nordic Hamstring Curl","muscle":"legs","category":"Legs & Glutes","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":6,"defaultWeight":0,"tips":"Elite eccentric hamstring exercise for injury prevention and strength."},
    {"id":"ex_hip_thrust","name":"Barbell Hip Thrust","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":10,"defaultWeight":80,"tips":"Maximum glute squeeze at top lockout with chin tucked."},
    {"id":"ex_single_hip_thrust","name":"Single-Leg Hip Thrust","muscle":"legs","category":"Legs & Glutes","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":16,"tips":"Isolate each glute without lower back compensation."},
    {"id":"ex_glute_bridge","name":"Barbell Glute Bridge","muscle":"legs","category":"Legs & Glutes","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":70,"tips":"Performed on floor with shortened range of motion for direct glute peak."},
    {"id":"ex_cable_pullthrough","name":"Cable Pull-Through","muscle":"legs","category":"Legs & Glutes","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":35,"tips":"Hinge at the hips and finish by squeezing the glutes forward."},
    {"id":"ex_glute_kickback","name":"Cable Glute Kickback","muscle":"legs","category":"Legs & Glutes","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":15,"tips":"Keep pelvis stable and kick back in line with glute fibers."},
    {"id":"ex_hip_abduction","name":"Hip Abduction Machine","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":45,"tips":"Targets gluteus medius and upper glute shelf; pause at full abduction."},
    {"id":"ex_hip_adduction","name":"Hip Adduction Machine","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":40,"tips":"Strengthens inner thighs and groin stabilizers with controlled tempo."},
    {"id":"ex_calf_raise","name":"Standing Calf Raise","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":15,"defaultWeight":45,"tips":"Pause for 1 second at full stretch and contraction."},
    {"id":"ex_smith_calf_raise","name":"Smith Machine Calf Raise","muscle":"legs","category":"Legs & Glutes","equipment":"Smith Machine","unilateral":false,"defaultSets":4,"defaultReps":15,"defaultWeight":60,"tips":"Use a stable step block to allow a deep ankle dorsiflexion stretch."},
    {"id":"ex_seated_calf_raise","name":"Seated Calf Raise","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":15,"defaultWeight":35,"tips":"Knees bent at 90 degrees isolates the soleus calf muscle."},
    {"id":"ex_donkey_calf_raise","name":"Donkey Calf Raise","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":50,"tips":"Hinged at 90 degrees for optimal stretch on the gastrocnemius."},
    {"id":"ex_single_calf_raise","name":"Single-Leg Standing Calf Raise","muscle":"legs","category":"Legs & Glutes","equipment":"Bodyweight","unilateral":true,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Use a full comfortable range and hold wall/rack for balance."},
    {"id":"ex_leg_press_calf","name":"Leg Press Calf Press","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":15,"defaultWeight":100,"tips":"Balls of feet on lower sled edge; avoid locking out knee joints."},
    {"id":"ex_tibialis_raise","name":"Standing Tibialis Anterior Raise","muscle":"legs","category":"Legs & Glutes","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":20,"defaultWeight":0,"tips":"Strengthens shin muscles to protect knees and improve ankle mobility."},
    {"id":"ex_smith_squat","name":"Smith Machine Squat","muscle":"legs","category":"Legs & Glutes","equipment":"Smith Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":70,"tips":"Place feet slightly forward to shift loading onto quadriceps."},
    {"id":"ex_band_leg_curl","name":"Resistance Band Leg Curl","muscle":"legs","category":"Legs & Glutes","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Anchor band securely to low post and pull heels toward glutes."},
    {"id":"ex_ohp","name":"Overhead Barbell Press (OHP)","muscle":"shoulders","category":"Shoulders","equipment":"Barbell","unilateral":false,"defaultSets":4,"defaultReps":8,"defaultWeight":45,"tips":"Squeeze glutes and abs tightly to support spinal posture."},
    {"id":"ex_seated_bb_press","name":"Seated Barbell Shoulder Press","muscle":"shoulders","category":"Shoulders","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":45,"tips":"Seated position eliminates leg drive for strict anterior delt development."},
    {"id":"ex_db_shoulder_press","name":"Seated Dumbbell Shoulder Press","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":22,"tips":"Full range of motion without arching lower back."},
    {"id":"ex_standing_db_press","name":"Standing Dumbbell Shoulder Press","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":18,"tips":"Engage core stabilizers while pressing dumbbells overhead simultaneously."},
    {"id":"ex_arnold_press","name":"Dumbbell Arnold Press","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":18,"tips":"Rotate smoothly from supinated to pronated overhead lockout."},
    {"id":"ex_machine_shoulder_press","name":"Machine Shoulder Press","muscle":"shoulders","category":"Shoulders","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":45,"tips":"Set seat so handles begin around shoulder height."},
    {"id":"ex_smith_ohp","name":"Smith Machine Overhead Press","muscle":"shoulders","category":"Shoulders","equipment":"Smith Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":40,"tips":"Set safety stops and avoid leaning back excessively."},
    {"id":"ex_push_press","name":"Barbell Push Press","muscle":"shoulders","category":"Shoulders","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":6,"defaultWeight":55,"tips":"Use shallow knee dip to drive heavy barbell through the sticking point."},
    {"id":"ex_db_lateral_raise","name":"Dumbbell Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":4,"defaultReps":12,"defaultWeight":10,"tips":"Raise to shoulder height leading with elbows slightly."},
    {"id":"ex_seated_lateral_raise","name":"Seated Dumbbell Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":9,"tips":"Seated posture stops hip swinging and isolates the side delt heads."},
    {"id":"ex_incline_lateral_raise","name":"Incline Bench Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":8,"tips":"Lie sideways on 30-degree incline to overload lateral delt in stretched position."},
    {"id":"ex_cable_lateral_raise","name":"Cable Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":false,"defaultSets":4,"defaultReps":12,"defaultWeight":7.5,"tips":"Provides constant cable tension throughout movement."},
    {"id":"ex_single_cable_lateral","name":"Single-Arm Cable Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":7.5,"tips":"Set pulley at hand or hip height for smooth tension curve."},
    {"id":"ex_cuffed_cable_lateral","name":"Behind-the-Back Cuffed Cable Lateral","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":7.5,"tips":"Wrist cuff takes grip out of equation for pure lateral deltoid isolation."},
    {"id":"ex_machine_lateral","name":"Machine Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":35,"tips":"Padded lever arm maintains resistance through full horizontal arc."},
    {"id":"ex_lu_raise","name":"Lu Dumbbell Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":7.5,"tips":"Full range lateral raise overhead popularized by Olympic weightlifter Lu Xiaojun."},
    {"id":"ex_face_pull","name":"Cable Rope Face Pull","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":false,"defaultSets":4,"defaultReps":15,"defaultWeight":20,"tips":"Pull rope toward eyes while externally rotating shoulders."},
    {"id":"ex_reverse_pec_deck","name":"Reverse Pec Deck Fly","muscle":"shoulders","category":"Shoulders","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":35,"tips":"Strengthens rear deltoids and postural upper back."},
    {"id":"ex_db_rear_delt","name":"Dumbbell Rear Delt Fly","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":10,"tips":"Hinge forward at hips and lead with elbows to recruit rear delts."},
    {"id":"ex_cable_rear_delt","name":"Cable Rear Delt Fly","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":10,"tips":"Cross cables without handles and pull open horizontally."},
    {"id":"ex_rear_delt_row","name":"Dumbbell Rear Delt Row","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":18,"tips":"Flared elbows at 90 degrees pulling wide to target posterior delts."},
    {"id":"ex_barbell_upright_row","name":"Barbell Upright Row","muscle":"shoulders","category":"Shoulders","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":35,"tips":"Pull bar toward upper chest leading with high elbows."},
    {"id":"ex_cable_upright_row","name":"Cable Upright Row","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":30,"tips":"Use EZ or straight bar attachment on low pulley for smooth shoulder pull."},
    {"id":"ex_cable_front_raise","name":"Cable Front Raise","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":12.5,"tips":"Smooth constant resistance targeting the anterior deltoid."},
    {"id":"ex_db_front_raise","name":"Dumbbell Front Raise","muscle":"shoulders","category":"Shoulders","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":10,"tips":"Raise dumbbell to eye level with neutral or pronated grip."},
    {"id":"ex_plate_front_raise","name":"Weight Plate Front Raise","muscle":"shoulders","category":"Shoulders","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":15,"tips":"Grip Olympic plate at 9 and 3 o clock and raise under control."},
    {"id":"ex_cable_y_raise","name":"Cable Incline Y-Raise","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":7.5,"tips":"Lie on incline bench and raise cables in a 30-degree Y shape for lateral/rear delts."},
    {"id":"ex_band_lateral_raise","name":"Resistance Band Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Stand on band securely and raise arms with continuous control."},
    {"id":"ex_band_face_pull","name":"Resistance Band Face Pull","muscle":"shoulders","category":"Shoulders","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Pull toward eye level and rotate thumbs behind you."},
    {"id":"ex_band_pullapart","name":"Resistance Band Pull-Apart","muscle":"shoulders","category":"Shoulders","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Keep ribs down and pull band apart at chest height for rear delts."},
    {"id":"ex_bicep_curl","name":"EZ-Bar Bicep Curl","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":30,"tips":"Keep elbows pinned to sides without swinging torso."},
    {"id":"ex_barbell_curl","name":"Straight Barbell Biceps Curl","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":30,"tips":"Supinated grip with full forearm supination for maximum bicep load."},
    {"id":"ex_db_bicep_curl","name":"Standing Alternating Dumbbell Curl","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":14,"tips":"Start neutral and supinate wrist at top for peak bicep contraction."},
    {"id":"ex_db_incline_curl","name":"Incline Dumbbell Curl","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":12,"tips":"Deep stretch on the long head of the bicep."},
    {"id":"ex_hammer_curl","name":"Dumbbell Hammer Curl","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":14,"tips":"Targets brachialis and forearm thickness."},
    {"id":"ex_cable_rope_hammer","name":"Cable Rope Hammer Curl","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":22.5,"tips":"Rope attachment on low pulley maintains tension throughout movement."},
    {"id":"ex_incline_hammer_curl","name":"Incline Dumbbell Hammer Curl","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":12,"tips":"Neutral grip curl on an incline for brachialis and forearms."},
    {"id":"ex_preacher_curl","name":"Machine Preacher Curl","muscle":"arms","category":"Arms","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":30,"tips":"Keep upper arms supported and avoid forceful lockout."},
    {"id":"ex_ez_preacher_curl","name":"EZ-Bar Preacher Curl","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":25,"tips":"Preacher bench eliminates shoulder movement for strict short head bicep focus."},
    {"id":"ex_concentration_curl","name":"Dumbbell Concentration Curl","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":12,"tips":"Brace your upper arm against your inner thigh."},
    {"id":"ex_cable_curl","name":"Cable Biceps Curl","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Maintain tension and lower the handle slowly."},
    {"id":"ex_single_cable_curl","name":"Single-Arm Cable Curl","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":12.5,"tips":"Keep upper arm still throughout the unilateral curl."},
    {"id":"ex_bayesian_curl","name":"Behind-the-Back Cable Bayesian Curl","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":10,"tips":"Face away from low pulley to stretch the long head of the bicep."},
    {"id":"ex_spider_curl","name":"Incline Bench Spider Curl","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":12,"tips":"Chest against 45-degree incline bench prevents bicep cheating."},
    {"id":"ex_hercules_curl","name":"High Cable Hercules Curl","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":12.5,"tips":"Curl cables from high dual pulleys with arms elevated at 90 degrees."},
    {"id":"ex_zottman_curl","name":"Dumbbell Zottman Curl","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":10,"tips":"Curl up with supinated grip, rotate wrists at top, and lower with pronated grip."},
    {"id":"ex_tricep_pushdown","name":"Cable Rope Tricep Pushdown","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Lock elbows in place and spread rope apart at lockout."},
    {"id":"ex_straight_bar_pushdown","name":"Straight-Bar Triceps Pushdown","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":30,"tips":"Overhand straight bar grip allows heavy triceps lateral head overload."},
    {"id":"ex_v_bar_pushdown","name":"V-Bar Triceps Pushdown","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":30,"tips":"Angled V-bar attachment protects wrists during heavy pressing."},
    {"id":"ex_single_triceps_pushdown","name":"Single-Arm Cable Triceps Pushdown","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":12.5,"tips":"Keep your shoulder still and extend fully without snapping."},
    {"id":"ex_overhead_cable_triceps","name":"Cable Overhead Triceps Extension","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":20,"tips":"Keep elbows pointed forward and ribs stacked."},
    {"id":"ex_skull_crushers","name":"EZ-Bar Skullcrushers","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":25,"tips":"Lower bar toward forehead keeping elbows fixed."},
    {"id":"ex_db_skull_crusher","name":"Dumbbell Skullcrushers","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":12,"tips":"Neutral dumbbell grip enables greater tricep stretch behind the head."},
    {"id":"ex_close_grip_bench","name":"Close-Grip Barbell Bench Press","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":55,"tips":"Hands shoulder-width apart to transfer heavy pressing overload to triceps."},
    {"id":"ex_jm_press","name":"Barbell JM Press","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":45,"tips":"Hybrid between close-grip bench press and skullcrusher for tricep mass."},
    {"id":"ex_cable_cross_body_triceps","name":"Cross-Body Cable Triceps Extension","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":10,"tips":"Dual cable cross extension aligning with tricep lateral and long heads."},
    {"id":"ex_overhead_db_triceps","name":"Seated Overhead Dumbbell Triceps Extension","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":24,"tips":"Cup heavy dumbbell with both hands overhead and lower deep behind neck."},
    {"id":"ex_cable_kickback","name":"Single-Arm Cable Triceps Kickback","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":7.5,"tips":"Keep upper arm fixed as you extend."},
    {"id":"ex_diamond_pushup","name":"Diamond Push-Up","muscle":"arms","category":"Arms","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":0,"tips":"Keep wrists comfortable and maintain a rigid trunk."},
    {"id":"ex_machine_dip","name":"Assisted Dip Machine","muscle":"arms","category":"Arms","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":35,"tips":"Adjust assistance and keep shoulders comfortable."},
    {"id":"ex_bench_dips","name":"Bench Dips","muscle":"arms","category":"Arms","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Hands on bench behind hips; lower to 90 degrees and push through triceps."},
    {"id":"ex_reverse_ez_curl","name":"Reverse EZ-Bar Forearm Curl","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":20,"tips":"Pronated grip curl building forearm extensors and brachioradialis."},
    {"id":"ex_wrist_curl","name":"Barbell Wrist Curl","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":25,"tips":"Rest forearms on bench and flex wrists to build forearm mass and grip."},
    {"id":"ex_reverse_wrist_curl","name":"Reverse Barbell Wrist Curl","muscle":"arms","category":"Arms","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":15,"tips":"Forearms on bench with palms down; extend wrists upward against resistance."},
    {"id":"ex_farmers_walk","name":"Dumbbell Farmer's Walk","muscle":"arms","category":"Arms","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":45,"defaultWeight":30,"tips":"Carry heavy dumbbells with tall posture for immense grip and trap endurance."},
    {"id":"ex_band_triceps","name":"Resistance Band Triceps Pushdown","muscle":"arms","category":"Arms","equipment":"Resistance Band","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Anchor overhead securely and control the return."},
    {"id":"ex_plank","name":"Forearm Plank","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":60,"defaultWeight":0,"tips":"Hold rigid body alignment with tight abs and glutes."},
    {"id":"ex_weighted_plank","name":"Weighted Forearm Plank","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":45,"defaultWeight":15,"tips":"Place weight plate securely on lower back for advanced core endurance."},
    {"id":"ex_side_plank","name":"Side Plank","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":true,"defaultSets":3,"defaultReps":45,"defaultWeight":0,"tips":"Keep shoulders stacked and hips lifted."},
    {"id":"ex_hanging_leg_raise","name":"Hanging Leg Raise","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":0,"tips":"Curl pelvis upward to flex abdominals effectively."},
    {"id":"ex_hanging_knee_raise","name":"Hanging Knee Raise","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Bend knees to 90 degrees and round lumbar spine into abdominal crunch."},
    {"id":"ex_captains_chair","name":"Captain's Chair Knee/Leg Raise","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Padded back rest stabilizes spine while raising legs to waist level."},
    {"id":"ex_cable_crunch","name":"Kneeling Cable Crunch","muscle":"core","category":"Core","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":35,"tips":"Flex through the trunk without pulling with your arms."},
    {"id":"ex_ab_wheel","name":"Ab Wheel Rollout","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":0,"tips":"High anti-extension core challenge from knees to full extension."},
    {"id":"ex_dragon_flag","name":"Dragon Flag","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":8,"defaultWeight":0,"tips":"Full body rigid lever raise inspired by Bruce Lee."},
    {"id":"ex_russian_twist","name":"Weighted Russian Twist","muscle":"core","category":"Core","equipment":"Dumbbell","unilateral":false,"defaultSets":3,"defaultReps":20,"defaultWeight":10,"tips":"Rotational oblique exercise performed with feet elevated."},
    {"id":"ex_decline_crunch","name":"Decline Sit-Up / Crunch","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Hook feet into decline bench and roll spine vertebra by vertebra."},
    {"id":"ex_dead_bug","name":"Dead Bug","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":0,"tips":"Keep lower back gently supported as limbs extend."},
    {"id":"ex_pallof_press","name":"Cable Pallof Press","muscle":"core","category":"Core","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":15,"tips":"Resist rotation and keep hips facing forward."},
    {"id":"ex_band_pallof","name":"Resistance Band Pallof Press","muscle":"core","category":"Core","equipment":"Resistance Band","unilateral":true,"defaultSets":3,"defaultReps":15,"defaultWeight":0,"tips":"Secure band at chest height before starting."},
    {"id":"ex_cable_woodchop","name":"Cable Wood Chop","muscle":"core","category":"Core","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":17.5,"tips":"Rotate through trunk while keeping movement controlled."},
    {"id":"ex_hanging_windshield_wipers","name":"Hanging Windshield Wipers","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":0,"tips":"Rotates legs side-to-side while hanging for maximum oblique power."},
    {"id":"ex_cable_side_bend","name":"Cable Side Bend","muscle":"core","category":"Core","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":15,"defaultWeight":20,"tips":"Stand lateral to low pulley and flex laterally through obliques."},
    {"id":"ex_toes_to_bar","name":"Toes to Bar","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":0,"tips":"Dynamic hanging gymnastic movement raising toes completely to touch the pull-up bar."},
    {"id":"ex_bicycle_crunches","name":"Bicycle Crunches","muscle":"core","category":"Core","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":20,"defaultWeight":0,"tips":"Alternating opposite elbow to knee flexion for rectus abdominis and obliques."},
    {"id":"ex_hiit_sprints","name":"Treadmill HIIT Sprints","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":8,"defaultReps":30,"defaultWeight":0,"tips":"30 seconds sprint at 90% intensity followed by 45s walk."},
    {"id":"ex_walking","name":"Incline Treadmill Walking","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":1,"defaultReps":30,"defaultWeight":0,"tips":"12% incline at 5 km/h for low-impact high-calorie expenditure."},
    {"id":"ex_rowing_machine","name":"Concept2 Rowing Machine","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":500,"defaultWeight":0,"tips":"Full body cardiovascular endurance with powerful drive and recovery."},
    {"id":"ex_assault_bike","name":"Air / Assault Bike Sprints","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":6,"defaultReps":30,"defaultWeight":0,"tips":"Max effort metabolic conditioning engaging both upper and lower body."},
    {"id":"ex_stationary_bike","name":"Stationary Bike","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":1,"defaultReps":20,"defaultWeight":0,"tips":"Adjust seat height so knee remains slightly bent at the bottom."},
    {"id":"ex_stair_climber","name":"StairMaster / Stair Climber","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":1,"defaultReps":15,"defaultWeight":0,"tips":"Continuous aerobic climbing targeting glutes, quads, and calves."},
    {"id":"ex_jump_rope","name":"Jump Rope / Double Unders","muscle":"cardio","category":"Cardio","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":100,"defaultWeight":0,"tips":"Fast footwork and high heart-rate conditioning."},
    {"id":"ex_kettlebell_swings","name":"Kettlebell Swings","muscle":"cardio","category":"Cardio","equipment":"Dumbbell","unilateral":false,"defaultSets":4,"defaultReps":15,"defaultWeight":20,"tips":"Explosive hip hinge driving bell to chest height; snap glutes at lockout."},
    {"id":"ex_battle_ropes","name":"Battle Ropes","muscle":"cardio","category":"Cardio","equipment":"Bodyweight","unilateral":false,"defaultSets":4,"defaultReps":30,"defaultWeight":0,"tips":"Alternating rapid slams build shoulder stamina and anaerobic capacity."},
    {"id":"ex_sled_push","name":"Sled / Prowler Push","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":20,"defaultWeight":60,"tips":"Drive through ground with 45-degree body lean for maximum leg drive."},
    {"id":"ex_landmine_chest_press","name":"Landmine Chest Press","muscle":"chest","category":"Chest","equipment":"Barbell","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Arc movement path provides high peak contraction at upper chest."},
    {"id":"ex_converging_chest_press","name":"Converging Chest Press Machine","muscle":"chest","category":"Chest","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":55,"tips":"Handles converge inward as you press for maximum pectoral shortening."},
    {"id":"ex_decline_cable_fly","name":"Decline Cable Fly (High to Low)","muscle":"chest","category":"Chest","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":15,"tips":"Isolates lower sternal pectoralis fibers through a downward sweeping motion."},
    {"id":"ex_chest_supported_tbar","name":"Chest-Supported T-Bar Row","muscle":"back","category":"Back","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":45,"tips":"Total rhomboid and mid-trap loading with chest pinned securely to pad."},
    {"id":"ex_landmine_meadows_row","name":"Meadows Row (Landmine)","muscle":"back","category":"Back","equipment":"Barbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":30,"tips":"Stand perpendicular to bar for supreme lat flare, stretch, and scapular movement."},
    {"id":"ex_dual_pulley_lat_row","name":"Dual Cable Lat Row (Kneeling)","muscle":"back","category":"Back","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":30,"tips":"Direct line of pull aligned with lower lat fibers."},
    {"id":"ex_single_arm_lat_pulldown","name":"Single-Arm Half-Kneeling Lat Pulldown","muscle":"back","category":"Back","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":25,"tips":"Provides immense lat stretch and unilateral imbalance correction."},
    {"id":"ex_smith_hip_thrust","name":"Smith Machine Hip Thrust","muscle":"legs","category":"Legs & Glutes","equipment":"Smith Machine","unilateral":false,"defaultSets":4,"defaultReps":12,"defaultWeight":80,"tips":"Highly stable glute lockout with pad positioned across hips."},
    {"id":"ex_pendulum_squat","name":"Pendulum Squat Machine","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":60,"tips":"Extreme quad tension through deep knee flexion with zero spinal loading."},
    {"id":"ex_hack_squat_reverse","name":"Reverse Hack Squat (Glute Hinge)","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":70,"tips":"Face inward on hack squat machine to heavily load glutes and hamstrings."},
    {"id":"ex_reverse_nordic","name":"Reverse Nordic Quad Extension","muscle":"legs","category":"Legs & Glutes","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":0,"tips":"Loaded eccentric stretch for the rectus femoris quadriceps head."},
    {"id":"ex_seated_calf_machine","name":"Seated Calf Raise Machine","muscle":"legs","category":"Legs & Glutes","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":15,"defaultWeight":35,"tips":"Bent knee takes gastrocnemius off tension, placing primary load on soleus."},
    {"id":"ex_sissy_squat_bench","name":"Sissy Squat Bench","muscle":"legs","category":"Legs & Glutes","equipment":"Bodyweight","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":0,"tips":"Isolates teardrop VMO and distal quadriceps in a locked lower-leg position."},
    {"id":"ex_smith_overhead_press","name":"Smith Machine Overhead Shoulder Press","muscle":"shoulders","category":"Shoulders","equipment":"Smith Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":40,"tips":"Safe heavy anterior delt loading without bar balance drift."},
    {"id":"ex_behind_back_lateral","name":"Behind-the-Back Cable Lateral Raise","muscle":"shoulders","category":"Shoulders","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":6,"tips":"Cable passing behind back creates continuous lateral head tension from bottom."},
    {"id":"ex_landmine_press","name":"Landmine Single-Arm Shoulder Press","muscle":"shoulders","category":"Shoulders","equipment":"Barbell","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":20,"tips":"Scapular plane friendly pressing for cranky shoulders."},
    {"id":"ex_preacher_machine","name":"Preacher Curl Machine","muscle":"arms","category":"Arms","equipment":"Machine","unilateral":false,"defaultSets":3,"defaultReps":10,"defaultWeight":35,"tips":"Strict short-head bicep isolation with no elbow momentum or cheating."},
    {"id":"ex_incline_cable_overhead_triceps","name":"Incline Bench Overhead Cable Triceps Extension","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":12,"defaultWeight":20,"tips":"Forces full stretch on the long head of the triceps while leaning back."},
    {"id":"ex_cross_body_tricep_extension","name":"Cross-Body Dual Cable Triceps Extension","muscle":"arms","category":"Arms","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":10,"tips":"Cables cross in front of body; extend elbows out to sides for peak lateral tricep."},
    {"id":"ex_standing_cable_crunch","name":"Standing Cable Crunch","muscle":"core","category":"Core","equipment":"Cable","unilateral":false,"defaultSets":3,"defaultReps":15,"defaultWeight":30,"tips":"Round thoracic spine like a shrimp; do not hinge at the hips."},
    {"id":"ex_cable_woodchopper_high_low","name":"Cable Woodchopper (High to Low)","muscle":"core","category":"Core","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":12,"defaultWeight":15,"tips":"Rotational core power driving through obliques and abdominal wall."},
    {"id":"ex_pallof_press_iso","name":"Pallof Press with Isometric Hold","muscle":"core","category":"Core","equipment":"Cable","unilateral":true,"defaultSets":3,"defaultReps":10,"defaultWeight":12,"tips":"Anti-rotation core brace holding hands extended for 3 seconds per rep."},
    {"id":"ex_skierg","name":"Concept2 SkiErg","muscle":"cardio","category":"Cardio","equipment":"Machine","unilateral":false,"defaultSets":4,"defaultReps":30,"defaultWeight":0,"tips":"Upper body and lat-driven cardiovascular conditioning."}
  ],

  // קטגוריות ועמודות אימון ועמודות אימון ייעודיות ונפרדות לכל סוג אימון
  workoutCategories: [
    { id: 'all', name: 'כל האימונים', icon: '' },
    { id: 'push', name: 'אימוני דחיפה (Push)', icon: '', desc: 'חזה, כתפיים ויד אחורית' },
    { id: 'pull', name: 'אימוני משיכה (Pull)', icon: '', desc: 'גב, דלתא אחורית ויד קדמית' },
    { id: 'legs', name: 'אימוני רגליים (Legs)', icon: '', desc: 'ארבע ראשי, המסטרינגס, ישבן ותאומים' },
    { id: 'upper', name: 'פלג גוף עליון (Upper)', icon: '', desc: 'אימון מקיף לפלג הגוף העליון' },
    { id: 'lower', name: 'פלג גוף תחתון (Lower)', icon: '', desc: 'כוח והיפרטרופיה לפלג הגוף התחתון' },
    { id: 'full_body', name: 'גוף מלא (Full Body)', icon: '', desc: 'תרכובות מורכבות לכל הגוף' },
    { id: 'specialized', name: 'שילובים ממוקדים (Splits)', icon: '', desc: 'חזה-גב, כתפיים-ידיים ועוד' }
  ],

  // מאגר אימונים מסודר בעמודות וקטגוריות נפרדות - מורחב ומגוון בעושר תרגילים
  presetWorkouts: [
    // --- 1. PUSH (דחיפה) ---
    {
      id: 'session_push',
      category: 'push',
      section: 'individual_session',
      name: 'Push Session',
      hebrewName: 'אימון פוש (דחיפה)',
      subtitle: 'חזה, כתפיים ויד אחורית (Chest, Shoulders & Triceps Focus)',
      level: 'Intermediate',
      durationMinutes: 60,
      caloriesBurnEstimate: 420,
      defaultRestSeconds: 90,
      badge: 'Push',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 70 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 24 },
        { exerciseId: 'ex_machine_chest_press', sets: 3, reps: 10, weight: 55 },
        { exerciseId: 'ex_pec_deck', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_ohp', sets: 3, reps: 8, weight: 45 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 4, reps: 12, weight: 7.5 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_overhead_cable_triceps', sets: 3, reps: 12, weight: 20 }
      ]
    },

    // --- 2. PULL (משיכה) ---
    {
      id: 'session_pull',
      category: 'pull',
      section: 'individual_session',
      name: 'Pull Session',
      hebrewName: 'אימון פול (משיכה)',
      subtitle: 'גב, דלתא אחורית ויד קדמית (Back, Rear Delts & Biceps Focus)',
      level: 'Intermediate',
      durationMinutes: 65,
      caloriesBurnEstimate: 430,
      defaultRestSeconds: 90,
      badge: 'Pull',
      exercises: [
        { exerciseId: 'ex_deadlift', sets: 3, reps: 6, weight: 110 },
        { exerciseId: 'ex_lat_pulldown', sets: 4, reps: 10, weight: 55 },
        { exerciseId: 'ex_pullups', sets: 3, reps: 8, weight: 0 },
        { exerciseId: 'ex_barbell_row', sets: 4, reps: 8, weight: 60 },
        { exerciseId: 'ex_seated_cable_row', sets: 3, reps: 12, weight: 50 },
        { exerciseId: 'ex_pullover_cable', sets: 3, reps: 15, weight: 25 },
        { exerciseId: 'ex_face_pull', sets: 4, reps: 15, weight: 20 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 10, weight: 30 },
        { exerciseId: 'ex_db_incline_curl', sets: 3, reps: 12, weight: 12 }
      ]
    },

    // --- 3. LEGS (רגליים) ---
    {
      id: 'session_legs',
      category: 'legs',
      section: 'individual_session',
      name: 'Legs Session',
      hebrewName: 'אימון רגליים (Legs)',
      subtitle: 'ארבע ראשי, המסטרינגס, ישבן ותאומים (Quads, Hamstrings & Glutes Focus)',
      level: 'Advanced',
      durationMinutes: 65,
      caloriesBurnEstimate: 480,
      defaultRestSeconds: 120,
      badge: 'Legs',
      exercises: [
        { exerciseId: 'ex_squat', sets: 4, reps: 8, weight: 90 },
        { exerciseId: 'ex_leg_press', sets: 4, reps: 10, weight: 140 },
        { exerciseId: 'ex_rdl', sets: 3, reps: 10, weight: 65 },
        { exerciseId: 'ex_bulgarian_split_squat', sets: 3, reps: 10, weight: 14 },
        { exerciseId: 'ex_leg_extension', sets: 3, reps: 12, weight: 50 },
        { exerciseId: 'ex_hamstring_curl', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_hip_thrust', sets: 3, reps: 10, weight: 80 },
        { exerciseId: 'ex_calf_raise', sets: 4, reps: 15, weight: 45 }
      ]
    },

    // --- 4. UPPER BODY (פלג גוף עליון) ---
    {
      id: 'session_upper',
      category: 'upper',
      section: 'individual_session',
      name: 'Upper Body Session',
      hebrewName: 'אימון פלג גוף עליון (Upper)',
      subtitle: 'חזה, גב, כתפיים וידיים (Complete Upper Body Hypertrophy)',
      level: 'All Levels',
      durationMinutes: 60,
      caloriesBurnEstimate: 430,
      defaultRestSeconds: 90,
      badge: 'Upper',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 65 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 22 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 55 },
        { exerciseId: 'ex_lat_pulldown', sets: 3, reps: 10, weight: 50 },
        { exerciseId: 'ex_db_shoulder_press', sets: 3, reps: 10, weight: 20 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 3, reps: 12, weight: 7.5 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 }
      ]
    },

    // --- 5. LOWER BODY (פלג גוף תחתון) ---
    {
      id: 'session_lower',
      category: 'lower',
      section: 'individual_session',
      name: 'Lower Body Session',
      hebrewName: 'אימון פלג גוף תחתון (Lower)',
      subtitle: 'כוח והיפרטרופיה לכל פלג הגוף התחתון (Quads, Posterior Chain & Calves)',
      level: 'All Levels',
      durationMinutes: 60,
      caloriesBurnEstimate: 450,
      defaultRestSeconds: 120,
      badge: 'Lower',
      exercises: [
        { exerciseId: 'ex_squat', sets: 4, reps: 8, weight: 85 },
        { exerciseId: 'ex_rdl', sets: 3, reps: 10, weight: 60 },
        { exerciseId: 'ex_leg_press', sets: 3, reps: 10, weight: 130 },
        { exerciseId: 'ex_bulgarian_split_squat', sets: 3, reps: 10, weight: 14 },
        { exerciseId: 'ex_leg_extension', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_hamstring_curl', sets: 3, reps: 12, weight: 40 },
        { exerciseId: 'ex_calf_raise', sets: 4, reps: 15, weight: 40 },
        { exerciseId: 'ex_hanging_leg_raise', sets: 3, reps: 12, weight: 0 }
      ]
    },

    // --- 6. FULL BODY (גוף מלא) ---
    {
      id: 'session_full_body',
      category: 'full_body',
      section: 'individual_session',
      name: 'Full Body Session',
      hebrewName: 'אימון גוף מלא (Full Body)',
      subtitle: 'תרכובות מורכבות לכל הגוף (Efficient Compound Total Body Routine)',
      level: 'All Levels',
      durationMinutes: 60,
      caloriesBurnEstimate: 460,
      defaultRestSeconds: 90,
      badge: 'Full Body',
      exercises: [
        { exerciseId: 'ex_squat', sets: 3, reps: 8, weight: 80 },
        { exerciseId: 'ex_bench_press', sets: 3, reps: 8, weight: 65 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 55 },
        { exerciseId: 'ex_ohp', sets: 3, reps: 10, weight: 35 },
        { exerciseId: 'ex_rdl', sets: 3, reps: 8, weight: 65 },
        { exerciseId: 'ex_lat_pulldown', sets: 3, reps: 10, weight: 50 },
        { exerciseId: 'ex_bicep_curl', sets: 2, reps: 12, weight: 25 },
        { exerciseId: 'ex_tricep_pushdown', sets: 2, reps: 12, weight: 25 },
        { exerciseId: 'ex_plank', sets: 3, reps: 60, weight: 0 }
      ]
    },

    // --- 7. SPECIALIZED: CHEST & BACK ---
    {
      id: 'session_chest_back',
      category: 'specialized',
      section: 'individual_session',
      name: 'Chest & Back',
      hebrewName: 'אימון חזה וגב',
      subtitle: 'אנטגוניסטים עליונים מקיף (Antagonistic Upper Body Session)',
      level: 'Intermediate',
      durationMinutes: 55,
      caloriesBurnEstimate: 420,
      defaultRestSeconds: 90,
      badge: 'Chest & Back',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 70 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 24 },
        { exerciseId: 'ex_pec_deck', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_lat_pulldown', sets: 4, reps: 10, weight: 55 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 60 },
        { exerciseId: 'ex_seated_cable_row', sets: 3, reps: 12, weight: 50 },
        { exerciseId: 'ex_pullover_cable', sets: 3, reps: 15, weight: 25 }
      ]
    },

    // --- 8. SPECIALIZED: SHOULDERS & ARMS ---
    {
      id: 'session_shoulders_arms',
      category: 'specialized',
      section: 'individual_session',
      name: 'Shoulders & Arms',
      hebrewName: 'אימון כתפיים וידיים',
      subtitle: 'פיסול ובידוד כתפיים, יד קדמית ואחורית (Delts, Biceps & Triceps)',
      level: 'Intermediate',
      durationMinutes: 55,
      caloriesBurnEstimate: 390,
      defaultRestSeconds: 90,
      badge: 'Shoulders & Arms',
      exercises: [
        { exerciseId: 'ex_ohp', sets: 3, reps: 8, weight: 40 },
        { exerciseId: 'ex_db_shoulder_press', sets: 3, reps: 10, weight: 22 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 4, reps: 12, weight: 10 },
        { exerciseId: 'ex_face_pull', sets: 3, reps: 15, weight: 20 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 10, weight: 30 },
        { exerciseId: 'ex_db_incline_curl', sets: 3, reps: 12, weight: 12 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_skull_crushers', sets: 3, reps: 10, weight: 25 }
      ]
    },

    // --- 9. SPECIALIZED: BACK & SHOULDERS ---
    {
      id: 'session_back_shoulders',
      category: 'specialized',
      section: 'individual_session',
      name: 'Back & Shoulders',
      hebrewName: 'אימון גב וכתפיים',
      subtitle: 'גב, דלתא אחורית ורוחב כתפיים (Back & Shoulders V-Taper)',
      level: 'All Levels',
      durationMinutes: 55,
      caloriesBurnEstimate: 400,
      defaultRestSeconds: 90,
      badge: 'Back & Shoulders',
      exercises: [
        { exerciseId: 'ex_lat_pulldown', sets: 4, reps: 10, weight: 50 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 55 },
        { exerciseId: 'ex_seated_cable_row', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_pullover_cable', sets: 3, reps: 15, weight: 20 },
        { exerciseId: 'ex_db_shoulder_press', sets: 3, reps: 10, weight: 18 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 3, reps: 12, weight: 7.5 },
        { exerciseId: 'ex_reverse_pec_deck', sets: 3, reps: 15, weight: 30 },
        { exerciseId: 'ex_face_pull', sets: 3, reps: 15, weight: 20 }
      ]
    },

    // --- 10. SPECIALIZED: CHEST & ARMS ---
    {
      id: 'session_chest_arms',
      category: 'specialized',
      section: 'individual_session',
      name: 'Chest & Arms',
      hebrewName: 'אימון חזה וידיים',
      subtitle: 'חזה, יד קדמית ואחורית (Chest, Biceps & Triceps Hypertrophy)',
      level: 'All Levels',
      durationMinutes: 55,
      caloriesBurnEstimate: 390,
      defaultRestSeconds: 90,
      badge: 'Chest & Arms',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 65 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 22 },
        { exerciseId: 'ex_cable_fly', sets: 3, reps: 12, weight: 15 },
        { exerciseId: 'ex_dips', sets: 3, reps: 10, weight: 0 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 10, weight: 25 },
        { exerciseId: 'ex_hammer_curl', sets: 3, reps: 12, weight: 14 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_skull_crushers', sets: 3, reps: 10, weight: 20 }
      ]
    }
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // foodCategories and foodsDatabase are managed by the modular food system:
  //   src/foodCategories.js   → canonical category list
  //   src/foodsDatabase.js    → clean food source data (no inline categoryName)
  //   src/foodDatabaseManager.js → deduplication, defaults, categoryName injection
  //   src/index.js            → bootstraps the manager and patches FIT_DATA
  //
  // Placeholders below are replaced at runtime by src/index.js.
  // They are kept here so FIT_DATA is syntactically valid if the src/ scripts
  // somehow fail to load.
  // ─────────────────────────────────────────────────────────────────────────────

  // קטגוריות מזון — placeholder; replaced by src/index.js with the canonical list.
  foodCategories: [],

  // מאגר מזון — placeholder; replaced by src/index.js with a live getter.
  foodsDatabase: [],

  // נתוני מתאמנים בלעדיים למאמן
  coachTrainees: [
    {
      id: 'client_1',
      name: 'דניאל כהן',
      avatar: '👨‍🦱',
      age: 28,
      weight: 82.0,
      targetCalories: 2400,
      consumedCalories: 2150,
      consumedProtein: 172,
      burnedCalories: 380,
      waterMl: 2600,
      sleepHours: 7.5,
      hasWorkedOutToday: true,
      lastWorkout: {
        title: 'Push Session',
        durationMinutes: 52,
        completedSets: 20,
        totalVolume: 1620,
        difficulty: 8,
        difficultyLabel: 'Very Hard (RPE 8)',
        notes: 'Pec Deck Fly weights increased!',
        exercises: [
          { name: 'Pec Deck Fly', sets: 4, reps: 12, weight: 50 },
          { name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 75 }
        ]
      },
      mealsToday: [
        { name: 'Protein Shake & Oats', calories: 420, protein: 38 },
        { name: 'Chicken Breast & Rice', calories: 720, protein: 62 }
      ]
    }
  ],

  defaultProfile: {
    name: 'מתאמן',
    role: 'trainee',
    demoTraineeId: 'client_1',
    gender: 'male',
    age: 26,
    weight: 78.5,
    height: 178,
    targetCalories: 2250,
    targetProtein: 165,
    targetCarbs: 210,
    targetFat: 65,
    targetWaterMl: 2800,
    targetFiber: 28,
    maxSodium: 2300,
    maxSugar: 45,
    targetPotassium: 4700,
    sleepHours: 7.5,
    targetSleepHours: 8.0,
    streakDays: 4
  }
};

// Postprocessing: Dynamic Muscle Activations, Equipment Defaults & Secondary Muscles
FIT_DATA.exercises.forEach(exercise => {
  if (!exercise.equipment) {
    exercise.equipment = /Cable|Pulldown|Crossover|Face Pull|Pushdown/i.test(exercise.name) ? 'Cable'
      : /Machine|Pec Deck|Leg Press|Leg Extension|Curl|Raise|Stair/i.test(exercise.name) ? 'Machine'
        : /Dumbbell|DB |EZ-Bar/i.test(exercise.name) ? 'Dumbbell'
          : /Push-Up|Pull-Up|Chin-Up|Dips|Plank|Raise|Flag|Bug/i.test(exercise.name) ? 'Bodyweight'
            : /Barbell|Bench Press|Squat|Deadlift|Row|OHP|Shrug/i.test(exercise.name) ? 'Barbell'
              : 'Bodyweight';
  }
  if (typeof exercise.unilateral !== 'boolean') {
    exercise.unilateral = /One-Arm|Single-Arm|Single-Leg|Walking Lunge|Reverse Lunge|Step-Up|Bulgarian|Split Squat|Kickback|Side Plank|Pallof|Wood Chop/i.test(exercise.name);
  }
  const name = exercise.name.toLocaleLowerCase();
  const primaryLabel = exercise.muscle === 'chest' ? 'Chest / Pectorals'
    : exercise.muscle === 'back' ? (/pulldown|pull-up|pullup|chin-up/.test(name) ? 'Lats' : /deadlift|rack pull|back extension/.test(name) ? 'Spinal Erectors' : /shrug/.test(name) ? 'Upper Trapezius' : 'Upper Back')
    : exercise.muscle === 'legs' ? (/calf|soleus|tibialis/.test(name) ? 'Calves' : /curl|romanian|rdl|good morning|stiff-leg|nordic/.test(name) ? 'Hamstrings' : /abduction/.test(name) ? 'Gluteus Medius' : /adduction/.test(name) ? 'Hip Adductors' : /hip thrust|glute bridge|kickback|pull-through/.test(name) ? 'Gluteus Maximus' : 'Quadriceps')
    : exercise.muscle === 'shoulders' ? (/lateral|y-raise/.test(name) ? 'Lateral Deltoids' : /reverse|rear|face pull|pull-apart/.test(name) ? 'Rear Deltoids' : /front raise|plate raise/.test(name) ? 'Front Deltoids' : 'Front Deltoids')
    : exercise.muscle === 'arms' ? (/wrist|forearm|farmer|reverse.*curl/.test(name) ? 'Forearms' : /curl|zottman/.test(name) ? 'Biceps' : 'Triceps')
    : exercise.muscle === 'core' ? (/pallof|wood chop|woodchop|side plank|twist|wipers|side bend/.test(name) ? 'Obliques' : 'Core')
    : 'Cardiovascular';

  const specificActivations = [[primaryLabel, 5]];
  if (exercise.muscle === 'chest') {
    if (/press|push-up|dips/.test(name)) specificActivations.push(['Triceps', 4], ['Front Deltoids', 3]);
    else specificActivations.push(['Front Deltoids', 3]);
  } else if (exercise.muscle === 'back') {
    if (/pulldown|pull-up|pullup|chin-up/.test(name)) specificActivations.push(['Biceps', 3], ['Upper Back', 3]);
    else if (/deadlift/.test(name)) specificActivations.push(['Hamstrings', 4], ['Glutes', 4], ['Core', 3]);
    else specificActivations.push(['Lats', 4], ['Biceps', 3], ['Rear Deltoids', 2]);
  } else if (exercise.muscle === 'legs') {
    if (/leg extension/.test(name)) specificActivations.push(['Knee Stabilizers', 2]);
    else if (/leg curl/.test(name)) specificActivations.push(['Calves', 2]);
    else if (/curl|romanian|good morning|stiff-leg/.test(name)) specificActivations.push(['Glutes', 4], ['Spinal Erectors', 3]);
    else if (/hip thrust|kickback|abduction|pull-through/.test(name)) specificActivations.push(['Hamstrings', 3], ['Core', 2]);
    else if (/calf|soleus|tibialis/.test(name)) specificActivations.push(['Soleus', 4], ['Glutes', 2]);
    else specificActivations.push(['Glutes', 4], ['Core', 3], ['Hamstrings', 2]);
  } else if (exercise.muscle === 'shoulders') {
    if (/press|push press/.test(name)) specificActivations.push(['Triceps', 4], ['Upper Chest', 2]);
    else if (/lateral/.test(name)) specificActivations.push(['Supraspinatus', 3], ['Upper Trapezius', 2]);
    else specificActivations.push(['Upper Back', 3], ['Rotator Cuff', 2]);
  } else if (exercise.muscle === 'arms') {
    specificActivations.push([/curl/.test(name) ? 'Forearms' : 'Shoulders', 3]);
    if (/push-up|dip|bench|jm/.test(name)) specificActivations.push(['Chest', 3], ['Core', 2]);
  } else if (exercise.muscle === 'core') {
    specificActivations.push(['Hip Flexors', 2], ['Spinal Erectors', 2]);
  } else if (exercise.muscle === 'cardio') {
    specificActivations.push(['Calves', 3], ['Core', 2]);
  }

  exercise.activationRanks = specificActivations
    .filter(([, rank], index, list) => list.findIndex(([label]) => label === list[index][0]) === index && rank >= 2)
    .sort((left, right) => right[1] - left[1])
    .map(([label, rank], index) => ({ muscle: label, label, rank, order: index + 1 }));

  exercise.secondaryMuscles = exercise.activationRanks
    .slice(1)
    .map(item => item.muscle);
});

// -- Food Module Bootstrap ----------------------------------------------------
// The five fast-food / Israeli chain items previously pushed here have been
// moved to src/foodsDatabase.js and are registered via FoodDatabaseManager.
//
// Apply the modular food system patch now that FIT_DATA is fully defined.
// src/index.js exposes window.FitPulse._patchFitData; calling it here wires
// up the live foodCategories and foodsDatabase getter/setter on FIT_DATA.
if (typeof window !== 'undefined') {
  window.FIT_DATA = FIT_DATA;
  if (window.FitPulse && window.FitPulse._patchFitData) {
    window.FitPulse._patchFitData(FIT_DATA);
  }
} else if (typeof global !== 'undefined' && global.FitPulse && global.FitPulse._patchFitData) {
  global.FIT_DATA = FIT_DATA;
  global.FitPulse._patchFitData(FIT_DATA);
} else {
  // Fallback: src/ scripts were not loaded -- food data will be unavailable.
  console.warn(
    '[FitPulse] data.js: src/ food modules not loaded; food data will be empty. ' +
    'Check that src/foodCategories.js, src/foodDatabaseManager.js, ' +
    'src/foodsDatabase.js, and src/index.js are loaded before data.js in index.html.'
  );
}

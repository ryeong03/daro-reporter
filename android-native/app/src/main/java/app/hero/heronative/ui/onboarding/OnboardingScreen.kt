package app.hero.heronative.ui.onboarding

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.PermissionController
import app.hero.heronative.data.Guardian
import app.hero.heronative.data.isValidPhone
import app.hero.heronative.health.HealthConnectManager
import app.hero.heronative.health.HealthConnectNavigator
import app.hero.heronative.health.SamsungHealthNavigator
import app.hero.heronative.monitoring.MonitoringScheduler
import app.hero.heronative.ui.components.HeroDashedAddButton
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.components.HeroScreenTopBar
import app.hero.heronative.ui.theme.HeroColors
import app.hero.heronative.viewmodel.UserViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Figma 온보딩 플로우
 * 스플래시 → 소개 → 기본정보 → 보호자 → 개인정보동의 → 기기연결
 */
@Composable
fun OnboardingScreen(
    userViewModel: UserViewModel,
    onComplete: () -> Unit,
) {
    var step by remember { mutableIntStateOf(0) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    val guardians = remember { mutableStateListOf(Guardian("", "", "")) }
    var agreeService by remember { mutableStateOf(false) }
    var agreePrivacy by remember { mutableStateOf(false) }
    var agreeLocation by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var registered by remember { mutableStateOf(false) }
    var showBasicInfoError by remember { mutableStateOf(false) }
    var showDeviceDialog by remember { mutableStateOf(false) }

    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val healthManager = remember { HealthConnectManager(ctx.applicationContext) }

    var pendingOpenHealthConnect by remember { mutableStateOf(false) }

    val hcPermissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract(),
    ) { granted ->
        if (granted.containsAll(healthManager.permissions) && pendingOpenHealthConnect) {
            pendingOpenHealthConnect = false
            HealthConnectNavigator.openManageData(ctx, healthManager)
        }
    }

    val openHealthConnect: () -> Unit = {
        pendingOpenHealthConnect = true
        scope.launch {
            HealthConnectNavigator.openSettingsOrRequestPermissions(
                context = ctx,
                healthManager = healthManager,
                permissionLauncher = hcPermissionLauncher,
                onUnavailable = {
                    pendingOpenHealthConnect = false
                    scope.launch { snack.showSnackbar("Health Connect 앱을 설치해주세요") }
                },
            )
        }
    }

    val allAgreed = agreeService && agreePrivacy && agreeLocation

    if (showBasicInfoError) {
        HeroAlertDialog(
            message = "히어로 가입을 완료하려면\n이름과 전화번호를 모두 입력해야 해요.",
            onConfirm = { showBasicInfoError = false },
            onDismiss = { showBasicInfoError = false },
        )
    }

    if (showDeviceDialog) {
        HeroAlertDialog(
            message = "기기가 연결되어있지 않아요.\n갤럭시 핏 또는 스마트 워치를 켜고\n내 휴대폰과 블루투스 연결해주세요",
            onConfirm = {
                showDeviceDialog = false
                openHealthConnect()
            },
            onDismiss = { showDeviceDialog = false },
        )
    }

    when (step) {
        0 -> StepSplash(onFinished = { step = 1 })
        1 -> StepIntro(onStart = { step = 2 })
        5 -> DeviceConnectionStep(
            healthManager = healthManager,
            onBack = { step = 4 },
            onOpenHealthConnect = openHealthConnect,
            onOpenDevice = {
                if (!SamsungHealthNavigator.openDeviceManager(ctx)) {
                    scope.launch { snack.showSnackbar("Galaxy Wearable 또는 Samsung Health를 설치해주세요") }
                }
            },
            onDeviceDisconnected = { showDeviceDialog = true },
            onStart = {
                pendingOpenHealthConnect = true
                hcPermissionLauncher.launch(healthManager.permissions)
                onComplete()
            },
        )
        else -> Column(
            modifier = Modifier
                .fillMaxSize()
                .background(HeroColors.Background),
        ) {
            HeroScreenTopBar(
                showBack = true,
                onBack = { if (step > 2) step -= 1 else step = 1 },
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 24.dp),
            ) {
                OnboardingProgressBar(currentStep = step - 1)
                Spacer(Modifier.height(24.dp))

                when (step) {
                    2 -> {
                        OnboardingHeader(
                            title = "앱 가입을 위해\n정보를 등록해주세요",
                            subtitle = "히어로 가입을 위해 본인 정보를 입력해주세요",
                        )
                        Spacer(Modifier.height(24.dp))
                        HeroFormField("이름*", name, { name = it }, "이름을 입력해주세요")
                        Spacer(Modifier.height(24.dp))
                        HeroFormField(
                            "전화번호*",
                            phone,
                            { phone = it },
                            "전화번호를 입력해주세요",
                            KeyboardType.Phone,
                        )
                    }
                    3 -> {
                        OnboardingHeader(
                            title = "위급상황 시 연락을 받을\n보호자 정보를 입력해주세요",
                        )
                        Spacer(Modifier.height(24.dp))
                        guardians.forEachIndexed { i, g ->
                            GuardianCard(
                                index = i,
                                guardian = g,
                                canDelete = guardians.size > 1,
                                onUpdate = { guardians[i] = it },
                                onDelete = { if (guardians.size > 1) guardians.removeAt(i) },
                            )
                            Spacer(Modifier.height(16.dp))
                        }
                        HeroDashedAddButton(
                            text = "보호자 추가하기",
                            onClick = { guardians.add(Guardian("", "", "")) },
                        )
                    }
                    4 -> {
                        OnboardingHeader(
                            title = "개인정보 제공동의",
                            subtitle = "모두 동의해야 앱을 사용할 수 있어요.",
                        )
                        Spacer(Modifier.height(32.dp))
                        ConsentCheckRow(
                            label = "전체 동의하기",
                            checked = allAgreed,
                            onToggle = {
                                val next = !allAgreed
                                agreeService = next
                                agreePrivacy = next
                                agreeLocation = next
                            },
                        )
                        Spacer(Modifier.height(24.dp))
                        ConsentCheckRow(
                            label = "[필수] 서비스 이용 약관",
                            checked = agreeService,
                            onToggle = { agreeService = !agreeService },
                            showChevron = true,
                            onChevronClick = {},
                        )
                        ConsentCheckRow(
                            label = "[필수] 개인정보 수집 및 이용 동의",
                            checked = agreePrivacy,
                            onToggle = { agreePrivacy = !agreePrivacy },
                            showChevron = true,
                            onChevronClick = {},
                        )
                        ConsentCheckRow(
                            label = "[필수] 위치기반 서비스 이용약관 동의",
                            checked = agreeLocation,
                            onToggle = { agreeLocation = !agreeLocation },
                            showChevron = true,
                            onChevronClick = {},
                        )
                    }
                }
            }

            if (step in 2..4) {
                OnboardingBottomActions(
                    primaryText = "다음으로 넘어가기",
                    onPrimary = {
                        when (step) {
                            2 -> when {
                                name.isBlank() || phone.isBlank() -> showBasicInfoError = true
                                !isValidPhone(phone) ->
                                    scope.launch { snack.showSnackbar("전화번호는 10자리 이상이어야 합니다") }
                                else -> step = 3
                            }
                            3 -> {
                                val invalid = guardians.any { g ->
                                    (g.name.isNotBlank() || g.phone.isNotBlank()) &&
                                        (g.name.isBlank() || !isValidPhone(g.phone))
                                }
                                if (invalid) {
                                    scope.launch {
                                        snack.showSnackbar("보호자 이름과 전화번호(10자리 이상)를 확인해주세요")
                                    }
                                } else {
                                    step = 4
                                }
                            }
                            4 -> {
                                if (!allAgreed) {
                                    scope.launch { snack.showSnackbar("필수 약관에 모두 동의해주세요") }
                                } else if (!registered) {
                                    loading = true
                                    userViewModel.register(
                                        name = name,
                                        phone = phone,
                                        gender = null,
                                        birthDate = null,
                                        guardians = guardians.toList(),
                                        onSuccess = {
                                            loading = false
                                            registered = true
                                            MonitoringScheduler.schedule(ctx.applicationContext)
                                            step = 5
                                            openHealthConnect()
                                        },
                                        onError = { msg ->
                                            loading = false
                                            scope.launch { snack.showSnackbar(msg) }
                                        },
                                    )
                                } else {
                                    step = 5
                                }
                            }
                        }
                    },
                    secondaryText = "이전 화면으로 돌아가기",
                    onSecondary = { if (step > 2) step -= 1 else step = 1 },
                    primaryEnabled = !loading,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 48.dp),
                )
            }
            SnackbarHost(hostState = snack, modifier = Modifier.padding(horizontal = 24.dp))
        }
    }
}

@Composable
private fun StepSplash(onFinished: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(1500)
        onFinished()
    }
    HeroSplashGradientBackground {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("📍", fontSize = 80.sp)
            Spacer(Modifier.height(16.dp))
            Text(
                "Hero",
                fontSize = 100.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.Surface,
            )
        }
    }
}

@Composable
private fun StepIntro(onStart: () -> Unit) {
    HeroIntroGradientBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 100.dp),
        ) {
            HeroLogoText()
            Spacer(Modifier.height(32.dp))
            HeroIntroCard {
                Text(
                    "히어로는 이런 앱이에요",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = HeroColors.TextBody,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(24.dp))
                Text("📍", fontSize = 72.sp)
                Spacer(Modifier.height(24.dp))
                Text(
                    "히어로는 건강상태를 확인하고\n이상이 생기면 보건소와 가족에게\n바로 알리는 밭일 안전 도우미입니다!",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = HeroColors.TextBody,
                    lineHeight = 26.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(32.dp))
                HeroPrimaryButton("히어로 시작하기", onStart)
            }
        }
    }
}

@Composable
private fun GuardianCard(
    index: Int,
    guardian: Guardian,
    canDelete: Boolean,
    onUpdate: (Guardian) -> Unit,
    onDelete: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .background(HeroColors.Surface)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        RowWithDelete(
            title = "보호자 ${index + 1}",
            canDelete = canDelete,
            onDelete = onDelete,
        )
        HeroFormField("이름", guardian.name, { onUpdate(guardian.copy(name = it)) }, "이름을 입력해주세요")
        HeroFormField(
            "전화번호",
            guardian.phone,
            { onUpdate(guardian.copy(phone = it)) },
            "전화번호를 입력해주세요",
            KeyboardType.Phone,
        )
        HeroFormField(
            "관계",
            guardian.relation ?: "",
            { onUpdate(guardian.copy(relation = it)) },
            "나와의 관계를 적어주세요",
        )
    }
}

@Composable
private fun RowWithDelete(
    title: String,
    canDelete: Boolean,
    onDelete: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = HeroColors.TextBody)
        if (canDelete) {
            Text(
                text = "삭제하기",
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(HeroColors.Danger)
                    .clickable(onClick = onDelete)
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                color = HeroColors.Surface,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

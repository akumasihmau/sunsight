<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, string> */
    private const REGISTRATION = [
        'name' => 'Rafid',
        'email' => 'rafid@example.com',
        'password' => 'rahasia123',
        'password_confirmation' => 'rahasia123',
    ];

    public function test_pendaftaran_valid_mengembalikan_token_yang_dapat_dipakai(): void
    {
        $response = $this->postJson('/api/register', self::REGISTRATION);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);

        $this->withToken($response->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', 'rafid@example.com');
    }

    public function test_pendaftaran_membuat_user_di_basis_data(): void
    {
        $this->postJson('/api/register', self::REGISTRATION)->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'rafid@example.com']);
    }

    public function test_email_duplikat_ditolak_pada_field_email(): void
    {
        User::factory()->create(['email' => 'rafid@example.com']);

        $this->postJson('/api/register', self::REGISTRATION)
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_password_tanpa_konfirmasi_ditolak(): void
    {
        $payload = self::REGISTRATION;
        unset($payload['password_confirmation']);

        $this->postJson('/api/register', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_login_valid_mengembalikan_token_dan_profil(): void
    {
        User::factory()->create(['email' => 'rafid@example.com', 'password' => 'rahasia123']);

        $this->postJson('/api/login', ['email' => 'rafid@example.com', 'password' => 'rahasia123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_login_gagal_selalu_401_dengan_pesan_yang_identik(): void
    {
        User::factory()->create(['email' => 'rafid@example.com', 'password' => 'rahasia123']);

        $emailTidakTerdaftar = $this->postJson('/api/login', [
            'email' => 'tidak-terdaftar@example.com',
            'password' => 'rahasia123',
        ]);

        $passwordSalah = $this->postJson('/api/login', [
            'email' => 'rafid@example.com',
            'password' => 'password-salah',
        ]);

        $emailTidakTerdaftar->assertStatus(401);
        $passwordSalah->assertStatus(401);

        $this->assertSame(
            $emailTidakTerdaftar->json('message'),
            $passwordSalah->json('message'),
            'Pesan kesalahan tidak boleh membedakan email tidak terdaftar dari password salah.',
        );
    }

    public function test_token_tidak_berlaku_lagi_setelah_logout(): void
    {
        $token = $this->postJson('/api/register', self::REGISTRATION)->json('token');

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        // Permintaan HTTP nyata memakai proses baru, tetapi di dalam test container
        // dan guard dipakai ulang antar permintaan sehingga user yang sudah
        // terautentikasi masih ter-cache. Guard dilupakan agar yang diuji adalah
        // perilaku produksi, bukan cache test. Diverifikasi terhadap server nyata.
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/user')->assertStatus(401);
    }

    public function test_profil_menolak_permintaan_tanpa_token(): void
    {
        $this->getJson('/api/user')->assertStatus(401);
    }

    public function test_profil_tidak_pernah_memuat_field_sensitif(): void
    {
        $token = $this->postJson('/api/register', self::REGISTRATION)->json('token');

        $profile = $this->withToken($token)->getJson('/api/user')->assertOk()->json();

        $this->assertArrayNotHasKey('password', $profile);
        $this->assertArrayNotHasKey('remember_token', $profile);
    }

    public function test_route_di_luar_lingkup_tidak_lagi_terdaftar(): void
    {
        $uris = collect(Route::getRoutes()->getRoutes())->map(fn ($route) => $route->uri());

        $this->assertNotContains('api/forgot-password', $uris);
        $this->assertNotContains('api/reset-password', $uris);
    }
}
